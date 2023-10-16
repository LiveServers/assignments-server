import {Request,Response} from "express";
import db from "../db";
import { v4 as uuidv4 } from 'uuid';
import isEmpty from "lodash.isempty";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import responseHeaders from "../auth/responseHeaders";

type RequestBody = {
    password : string,
    email: string,
    phoneNumber?: string
}

type CreateAccountRequestBody = {
    password : string,
    email: string,
    phoneNumber: string,
    firstName: string,
    otherNames: string
}

type LogOutBody = {
    email : string;
}

const signIn = async (req:Request, res:Response) => {
    const {email,password,phoneNumber}:RequestBody = req?.body;
    if(password && (email || phoneNumber)){
        try{
            const {rows} = await db.query("SELECT * FROM users_table WHERE email = $1",[email]);
            if(rows.length > 0){
                //decrypt password
                const result = await bcrypt.compare(password,rows[0].password);
                if(result){
                    // set cookie/token
                    const token = jwt.sign({
                        // exp: Math.floor(Date.now() / 1000) + (60 * 60),
                        email:rows[0]?.email,id:rows[0]?.id
                      }, Buffer.from(process.env.SECRET || "", "base64"),{expiresIn:"1d"});

                    // we need to store the token in the db so that when we make a request we validate the token
                    await db.query("UPDATE users_table SET token = $1, paymentstatus=$2 WHERE email = $3 RETURNING token",[token,false,email]);
                    res.status(200).json(
                        {
                            headers: responseHeaders({statusCode:"200",customerMessage:"Success in signing in"}),
                            body: {
                                accessToken:token
                            }
                        }
                    );
                    return;
                }
                res.status(400).json(
                    {
                        headers: responseHeaders({statusCode:"400",customerMessage:"Wrong username or password"}),
                        body: null
                    }
                );
                return;
            }else{
                res.status(400).json(
                    {
                        headers: responseHeaders({statusCode:"400",customerMessage:"Wrong username or password"}),
                        body: null
                    }
                );
                return;
            }
        }catch(e){
            res.status(500).json(
                {
                    headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                    body: null
                }
            );
            console.log("ERROR",e)
        }
    }
    res.status(400).json(
        {
            headers: responseHeaders({statusCode:"400",customerMessage:"Missing either email or password"}),
            body: null
        }
    );
    return;
}

const createAccount = async (req:Request, res:Response) => {
    const {email,firstName,otherNames,phoneNumber,password}:CreateAccountRequestBody = req?.body;

    if(!isEmpty(firstName) && !isEmpty(otherNames) && !isEmpty(password) && !isEmpty(email)){
        try{
            // we need to check if there is a user who already exists with the email
            const userData = await db.query("SELECT * FROM users_table WHERE email = $1",[email]);
            if(userData?.rows.length < 1){
                const id = uuidv4();
                const saltRounds = 10;
                const hash = await bcrypt.hash(password,saltRounds);
                const newPassword = hash;
                const data = await db.query("INSERT INTO users_table(email,id,password,firstName,otherNames,phonenumber,paymentstatus) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING email,firstname,othernames,phonenumber,school,course,country,registrationnumber",[email,id,newPassword,firstName,otherNames,phoneNumber,false]);
                const token = jwt.sign({
                    email:userData?.rows[0]?.email,id:id
                  }, Buffer.from(process.env.SECRET || "", "base64"),{expiresIn:"1d"});
                // we need to store the token in the db so that when we make a request we validate the token
                await db.query("UPDATE users_table SET token = $1, paymentstatus=$2 WHERE email = $3 RETURNING token",[token,false,email]);
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"Success in creating account"}),
                        body: {
                            accessToken:token,
                            data:data?.rows[0],
                        }
                    }
                );
                return;
            }else{
                res.status(400).json(
                    {
                        headers: responseHeaders({statusCode:"400",customerMessage:"Email already registered"}),
                        body: null
                    }
                );
                return;
            }
        }catch(e){
            res.status(500).json(
                {
                    headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                    body: null
                }
            );
            console.log("ERROR",e)
        }
    }
    res.status(400).json(
        {
            headers: responseHeaders({statusCode:"400",customerMessage:"Missing either email or password"}),
            body: null
        }
    );
    return;
}

const fetchAccountDetails = async (req:Request, res:Response) => {
    const email = req.body?.decoded?.email;
    if(!isEmpty(email)){
        try{
            // we need to check if there is a user who already exists with the email
            const userData = await db.query("SELECT firstname,othernames,email,phonenumber,school,course,registrationnumber,country,isfreetrial,paymentstatus FROM users_table WHERE email = $1",[email]);
            if(userData?.rows.length >= 1){
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"User records fetched successfully"}),
                        body: userData.rows[0]
                    }
                );
                return;
            }else{
                res.status(404).json(
                    {
                        headers: responseHeaders({statusCode:"404",customerMessage:"No user found"}),
                        body: null
                    }
                );
                return;
            }
        }catch(e){
            res.status(500).json(
                {
                    headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                    body: null
                }
            );
            console.log("ERROR",e)
        }
    }
    res.status(400).json(
        {
            headers: responseHeaders({statusCode:"400",customerMessage:"Bad Request, You must be logged in"}),
            body: null
        }
    );
    return;
}

const updateAccountDetails = async (req:Request, res:Response) => {
    const {email,firstName,otherNames,school,country,registrationNumber,course,phoneNumber} = req?.body;
    const id =  req.body?.decoded?.id;
    if(!isEmpty(email)){
        try{
            // we need to check if there is a user who already exists with the email
            const userData = await db.query("UPDATE users_table SET firstname = $1,othernames=$2,phonenumber=$3,school=$4,course=$5,registrationnumber=$6,country=$7,paymentstatus=$8 WHERE id = $9 RETURNING email,firstname,othernames,phonenumber,school,course,country,registrationnumber",[firstName,otherNames,phoneNumber,school,course,registrationNumber,country,false,id]);
            if(userData?.rows.length >= 1){
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"User details updated successfully"}),
                        body: userData.rows[0]
                    }
                );
                return;
            }else{
                res.status(404).json(
                    {
                        headers: responseHeaders({statusCode:"404",customerMessage:"No user found"}),
                        body: null
                    }
                );
                return;
            }
        }catch(e){
            res.status(500).json(
                {
                    headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                    body: null
                }
            );
            console.log("ERROR",e);
            return;
        }
    }
    res.status(400).json(
        {
            headers: responseHeaders({statusCode:"400",customerMessage:"Bad Request, You must be logged in"}),
            body: null
        }
    );
}

const logOutUser = async (req:Request, res:Response) => {
    try{
        const email = req.body?.decoded?.email;
        await db.query("UPDATE users_table SET token = $1 WHERE email = $2 RETURNING token",["",email]);
        res.status(200).json(
            {
                headers: responseHeaders({statusCode:"200",customerMessage:"Log out successful"}),
                body: {
                    data:"Successfully logged you out",
                }
            }
        );
    }catch(e){
        res.status(500).json(
            {
                headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                body: null
            }
        );
        return;
    }
}

export default {
    signIn,
    createAccount,
    fetchAccountDetails,
    updateAccountDetails,
    logOutUser
}