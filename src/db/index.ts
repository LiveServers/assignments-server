import {Pool} from "pg";
 
const pool = new Pool();

export default {
  query: (text:string, params?:Array<string | number | undefined | string[] | boolean | Date> ) => pool.query(text, params),
}