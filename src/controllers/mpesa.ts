import {Request,Response} from "express";
import isEmpty from "lodash.isempty";
import { v4 as uuidv4 } from 'uuid';
import db from "../db";
import responseHeaders from "../auth/responseHeaders";
const utils = require("./utils");

class MpesaTransactions {
    private mpesaId:string; // this will be used by the callback to update the table :)
    constructor(){
        this.mpesaId = uuidv4();
        this.processMpesaRequest = this.processMpesaRequest.bind(this); // idk why we had to bind the methods to access this keyword in the functions
        this.lnmResponse = this.lnmResponse.bind(this);
    }

    async processMpesaRequest (req:Request, res:Response) {
        try{
            
            // get user id to create a relationship with mpesa table
            const userId = req.body?.decoded?.id;
            /*Obtain request payload from app UI*/
            let mssidn = req.body.number;
            /*Validate request body params*/
            let regExPattern = /^(?:254|\+254|0)?(7(?:(?:[129][0-9])|(?:0[0-8])|(4[0-1]))[0-9]{6})$/;
            let isNumberValid = regExPattern.test(mssidn);
            if(!isNumberValid) {
                res.status(400).json(
                    {
                        headers: responseHeaders({statusCode:"400",customerMessage:"Msisdn missing"}),
                        body: null
                    }
                );
                return;
            }
            const amount = "1";
            let msg = {"status": "","requestID": ""};
            /*--placeholder--*/  
            let postRes = utils.processRequest(amount, mssidn);
            // assign this to that
            const that = this;
            console.log("GETS HERE ONE",postRes);
            postRes.then(async function(rObj:any) {
                if(typeof(rObj.ResponseCode)!== "undefined" && 
                rObj.ResponseCode == "0") {
                let requestID = rObj.MerchantRequestID;
                let transactionObj = {
                    "requestID":requestID,
                    "mssidn":mssidn,
                    "amount":amount,
                    "callBackStatus":false,
                    "status":"PendingCompletion"
                }
                console.log("GETS HERE TWO", rObj);
                // call mpesa table
                const dts = await db.query("INSERT INTO mpesa_transaction_details(id,resultcode,resultdesc,status,callbackstatus,timestamp,requestid,metadata,msisdn,user_id) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10) RETURNING *",[uuidv4(),"","",transactionObj?.status,transactionObj?.callBackStatus,new Date(),transactionObj?.requestID,'""',mssidn,userId]);
                console.log("GETS HERE THREE",dts)
                msg.status="success";
                msg.requestID=rObj.MerchantRequestID;
                res.status(200).json(
                    {
                        headers: responseHeaders({statusCode:"200",customerMessage:"Success. PendingCompletion"}),
                        body: msg
                    }
                );
            } else { 
                res.status(500).json(
                    {
                        headers: responseHeaders({statusCode:"500",customerMessage:"Error"}),
                        body: null
                    }
                );
                return;
                }
            });
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
    
    /**
     * for security purposes, we will have to call the chatgpt api from  this api to prevent attacks from the client side setup
     */
    async lnmResponse (req:Request, res:Response) {
        try{
            let requestID = req.body.Body.stkCallback.MerchantRequestID;
            let transData:any = {};
            let resultCode = req.body.Body.stkCallback.ResultCode;
            let status = resultCode == "1032" ? "Cancelled" : (
              resultCode == "1037" ? "RequestTimeOut" : (
                resultCode == "0" ? "Success" : "Failed"));
            let resultDesc = req.body.Body.stkCallback.ResultDesc;
            transData.resultCode = resultCode;
            transData.resultDesc = resultDesc;
            transData.status = status;
            transData.callBackStatus = true;
            transData.timeStamp = utils.getTimeStamp();
            transData.requestID = requestID;
            transData.metaData = req.body.Body.stkCallback.CallbackMetadata;
            const response = await db.query("SELECT * FROM mpesa_transaction_details WHERE requestid=$1",[requestID]);
            console.log("RESPONSE ONE", response.rows[0]);
            const what = await db.query("UPDATE users_table SET paymentstatus=$1 WHERE id=$2 RETURNING *",[true,response?.rows[0]?.user_id]);
            console.log("RESPONSE TWO", what.rows[0]);
            await db.query("UPDATE mpesa_transaction_details SET resultcode=$1,resultdesc=$2,status=$3,callbackstatus=$4,timestamp=$5,metadata=$6 WHERE requestid=$7 RETURNING *",[transData?.resultCode,transData?.resultDesc,transData?.status,transData?.callBackStatus,new Date(),JSON.stringify(transData?.metaData),requestID]);
            /*Send ACK receipt back to the LNM API*/  
            let message = {"ResponseCode": "0", "ResponseDesc": "success"};
            res.status(200).json(
                {
                    headers: responseHeaders({statusCode:"200",customerMessage:"Mpesa Payment Successful"}),
                    body: message
                }
            );
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

}

export default MpesaTransactions;