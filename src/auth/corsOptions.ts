import cors, {CorsOptions} from "cors";

export default function corsOptions (){
    const allowedOrigins = process.env.ORIGIN || [""];
    console.log("ALLOWED", allowedOrigins)
    const corsOptions: CorsOptions = {
      methods: 'GET,HEAD,OPTIONS,PUT,PATCH,POST,DELETE',
      origin: function(origin, callback){
        console.log("THESE ARE THE ORIGINS", origin);
        if(!origin) return callback(new Error("Cant allow you to proceed"), false);
        if(allowedOrigins.indexOf(origin) === -1){
          return callback(new Error("Cant allow you to proceed"), false)
        }
        return callback(null, true);
      },
      preflightContinue: false,
      credentials: true,
    }
    return corsOptions;
}