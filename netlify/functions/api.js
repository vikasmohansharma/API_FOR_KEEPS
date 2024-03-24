// netlify/functions/api.ts
import express from "express";
import serverless from "serverless-http";

const api = express();
const router = express.Router();

router.get("/hello", (req, res) => res.send("Hello World!"));

api.use("/api/", router);

router.get('/notes/show/:id', async (req, res) => {
  try {
    var user = parseInt(req.params.id);
    //console.log(`user = ${user}`);
    const result = await supabase
    .from('notes_table')
    .select('*')
    .eq('user_id', user)
    .order('note_id')
  
    //console.log(result);
    res.json(result.data);
  } catch (error) {
    console.error('Error fetching notes:', error);
    res.status(500).json({ error: 'Error fetching notes' });
  }
});

export const handler = serverless(api);
