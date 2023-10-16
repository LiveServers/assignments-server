import express,{Request,Response,NextFunction} from "express";
import helmet from "helmet";
import cors, {CorsOptions} from "cors";
import {expressjwt} from 'express-jwt';
import mountRoutes from "./routes";
import responseHeaders from "./auth/responseHeaders";

const app = express();

// first layer of protection for token
app.use(expressjwt({
    secret:Buffer.from(process.env.SECRET || "", "base64"),
    algorithms:["HS256"],
    credentialsRequired:false,
}).unless({ path: ["/api/v1/account/sign-in","/api/v1/account/create-account","/api/v1/mpesa/hooks/lnmResponse"] }));

const allowedOrigins = process.env.ORIGIN || [""];

const corsOptionsDelegate = function (req:Request, callback:any) {
  console.log("METHODS", req.url, req.originalUrl, req.headers.origin)
  const corsOptions = {
    methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
    preflightContinue: false,
    credentials: true,
    origin: false
  };
  if(req.url === "/api/v1/mpesa/hooks/lnmResponse" || req.originalUrl === "/api/v1/mpesa/hooks/lnmResponse"){
    corsOptions.origin = true;
    callback(null, corsOptions);
    return;
  }
  if(!req.headers.origin) return callback(new Error("Cant allow you to proceed"), false);
  if (allowedOrigins.indexOf(req.headers.origin || "") !== -1) {
    corsOptions.origin = true;
  } else {
    return callback(new Error("Cant allow you to proceed"), false);
  }
  callback(null, corsOptions);
}
app.use(cors(corsOptionsDelegate));

//handling the error thrown by express-jwt and cors packages(maybe others)
app.use(function (err:Error, req:Request, res:Response, next:NextFunction) {
  if(err){
    res.status(401).json(
      {
          headers: responseHeaders({statusCode:"401",customerMessage:"Unauthorized"}),
          body: null
      }
  );
  }else{
    next(err);
  }
});

app.use(express.urlencoded({extended:false}));
app.use(helmet({contentSecurityPolicy: process.env.NODE_ENV === "production" ? undefined : false}));
app.use(express.json());
const port = process.env.PORT || 3333;

mountRoutes(app);

app.listen(port, () => {
  console.log(`App listening at http://localhost:${port}`);
});
