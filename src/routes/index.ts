import account from "./account";
import chatgpt from "./chatgpt";
import mpesa from "./mpesa";
import { Express } from "express";

export default function(app:Express){
    app.use("/api/v1/account",account)
    app.use("/api/v1/chat-gpt",chatgpt)
    app.use("/api/v1/mpesa",mpesa)
}