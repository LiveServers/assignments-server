import {Request,Response} from "express";
import isEmpty from "lodash.isempty";
import { ChatGPTAPI } from "chatgpt";
import db from "../db";
import responseHeaders from "../auth/responseHeaders";
const { Configuration, OpenAIApi } = require("openai");

console.log("MAD", process.env.CHAT_GPT_API_KEY);

const processGptQuestion =async (question:string, res:Response) => {
    if(!isEmpty(question)){
        const api = new ChatGPTAPI({
            apiKey: process.env.CHAT_GPT_API_KEY || ""
        });
        const response = await api.sendMessage(question);
        return response;
    }else{
        res.status(400).json(
            {
                headers: responseHeaders({statusCode:"400",customerMessage:"Please pass a question"}),
                body: null
            }
        );
        return;
    }
}

export const unauthenticatedChatGptApiCall = async (req:Request, res:Response) => {
    try{
        const question = req.body.question;
        const response = await processGptQuestion(question, res);
        res.status(200).json(
            {
                headers: responseHeaders({statusCode:"200",customerMessage:"Fetched data successfully"}),
                body: {
                    data: response?.text
                }
            }
        );
        return;
    }catch(e:any){
        console.log("ERR",e)
        res.status(500).json(
            {
                headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                body: e?.message
            }
        );
    }
}

const fetchChatGptResponse = async (req:Request, res:Response) => {
    try{
        // we need to check payment status of the user and also if they have free trial
        const id = req.body?.decoded?.id;
        const userData = await db.query("SELECT paymentstatus, isfreetrial FROM users_table WHERE id=$1",[id]);
        const {paymentstatus, isfreetrial} = userData?.rows[0];
        if(userData?.rows.length > 0){
            const question = req.body.question;
            if(isfreetrial){
                const response = await processGptQuestion(question, res);
                // update the free trial status to false
                await db.query("UPDATE users_table SET isfreetrial=$1 WHERE id=$2",[false,id]);
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"Fetched data successfully"}),
                        body: {
                            data: response?.text
                        }
                    }
                );
                return;
            }
            if(paymentstatus){ // this means that they have paid
                const response = await processGptQuestion(question, res);
                // update the payment status to false and return chatgpt response
                await db.query("UPDATE users_table SET paymentstatus=$1 WHERE id=$2",[false,id]);
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"Fetched data successfully"}),
                        body: {
                            data: response?.text
                        }
                    }
                );
                return;
            }
        }else{
            res.status(500).json(
                {
                    headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                    body: null
                }
            );
        }
    }catch(e){
        console.log("ERR",e)
        res.status(500).json(
            {
                headers: responseHeaders({statusCode:"500",customerMessage:"Internal Server Error"}),
                body: JSON.stringify(e)
            }
        );
    }
}

export default fetchChatGptResponse;