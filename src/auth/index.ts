import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import responseHeaders from "./responseHeaders";
import db from "../db";

// auth middleware
async function isAuth(req:Request, res:Response, next:NextFunction) {
    try{
        if (
            req.headers.authorization &&
            req.headers.authorization.split(" ")[0] === "Bearer"
          ) {
            const token = req.headers.authorization.split(" ")[1];
            // lets always check if the token is the same as the one stored in the db
            // talking directly to the db all the time is a hustle but ...
            const {rows} = await db.query("SELECT * FROM users_table WHERE token = $1",[token]);
            if(rows?.length > 0 && rows[0]?.token === token){
                return jwt.verify(token, Buffer.from(process.env.SECRET || "", "base64"),(err, decoded)=>{
                    if(err?.name === "TokenExpiredError"){
                        res.status(401).json(
                            {
                                headers: responseHeaders({statusCode:"401",customerMessage:"Invalid Token, Please sign in"}),
                                body: null
                            }
                        );
                        return;
                    } 
                    if(err?.name === "JsonWebTokenError"){
                        res.status(401).json(
                            {
                                headers: responseHeaders({statusCode:"401",customerMessage:"Invalid Token, Please sign in"}),
                                body: null
                            }
                        );
                        return;
                    } 
                    // here we have to use decoded so as not to risk giving  out other user data
                    req.body.decoded = decoded;
                    next();
                }); 
            }
            else{
                res.status(401).json(
                    {
                        headers: responseHeaders({statusCode:"401",customerMessage:"Please sign in"}),
                        body: null
                    }
                );
                return;
              }
          }
          res.status(401).json(
            {
                headers: responseHeaders({statusCode:"401",customerMessage:"No Token Available, Please sign in"}),
                body: null
            }
        );
    }catch(err){
        throw new Error("Invalid Token")
    }
}

export default isAuth;