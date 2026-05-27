import express from "express";
import mysql from "mysql2/promise";

const app = express();

const db = mysql.createPool(
    {
        host : 'rpgtcc2.mysql.dbaas.com.br',
        user : 'rpgtcc2',
        password: 'Rpg@TCC2',
        database: 'rpgtcc2',
        waitForConnections : true,  
        connectionLimit: 10,
        queueLimit: 0
    }
)

app.use(express.json());
app.use(express.urlencoded({ extended: true}));

app.get("/campanha", async (req,res) => {
   try {

        const sql = "SELECT * FROM campanha";
        const [rows] =  await db.query(sql);

        res.status(200).json(rows);
    
   } catch (error) {
        console.log(error);
        res.status(500).json({ erro : 'Erro ao solicitar o cliente'})
   }
});




export default app;
