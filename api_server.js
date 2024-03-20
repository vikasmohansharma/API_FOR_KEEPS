// api_server.js

import express from "express";
import { createClient } from '@supabase/supabase-js';
import bodyParser from "body-parser";
import pg from "pg";
import cors from "cors";
import bcrypt from "bcrypt";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import env from "dotenv";
env.config();

const app = express();
const port = process.env.API_PORT;

// Middleware 

// Configure session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { 
      maxAge: 60 * 1000, // 30 days
      secure: false, // set this to true if you are running over HTTPS, false otherwise
      sameSite: 'none' // set this to 'none' if your API server and client are on different domains, 'strict' otherwise
    }
  })
);


//SUPABASE CONNECTION
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);




app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use(cors({ credentials: true, origin: 'http://localhost:3000' })); // replace the origin with your client's address
app.use(passport.initialize());
app.use(passport.session());

// Login endpoint
app.post('/login', passport.authenticate('local'), (req, res) => {
  //console.log(req.session);
  res.json({ message: 'Login successful', user: req.user });
});

// Register endpoint
app.post('/register', async (req, res) => {
  const { email, password, username } = req.body;
  const { data, error } = await supabase
    .from('users_table')
    .select('user_email')
    .eq('user_email', email);

  if (error) {
    console.log(`Error encountered in api_server.js : ${error}`);
    res.status(500).json({ error: 'Error checking user email' });
    return;
  }

  if (data.length > 0) {
    res.status(409).json({ message: 'Email already in use' });
    return;
  }
  const hashedPassword = await bcrypt.hash(password, 10);
  try {
    await supabase
    .from('users_table')
    .insert([{ user_email: email, user_password: hashedPassword, user_username: username }]);
    res.status(201).json({ message: 'User registered successfully' });
  } catch (error) {
    console.log(`Error encountered in api_server.js : ${error}`);
    res.status(500).json({ error: 'Error registering user' });
  }
});

// Logout endpoint
app.get('/logout', (req, res) => {
  req.logout(function (err) {
    if (err) {
      return next(err);
    }}); // clear the authenticated user session
  res.clearCookie('connect.sid'); // clear the session cookie
  res.json({ message: 'Logout successful' });
});

// API endpoints for CRUD operations

app.post('/auth/user', async (req,res) => {
  const user_email = req.body.userEmail;
  const result = await supabase
  .from('users_table')
  .select('*')
  .eq('user_email', user_email);
  //console.log(result.rows[0].user_username);
  res.json(result.data);
})

app.post('/auth/user/profile', async (req,res) => {
  const user_email = req.body.userEmail;
  const result = await supabase
  .from('users_table')
  .select('*')
  .eq('user_email', user_email);
  //console.log(result.rows[0].user_username);
  res.json(result.data);
})

//render all notes for the selected user
app.get('/notes/show/:id', async (req, res) => {
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

//Route to add notes
app.post('/notes/add/:id/', async (req, res) => {
  const { title, content, status } = req.body;
  //const q = req.body;
  const user = parseInt(req.params.id);
  //console.log(title);

  try {
    await supabase
    .from('notes_table')
    .insert([{ user_id: user, note_title: title, note_content: content, datetimedetails: status }]);
    res.status(201).json({ message: 'Note added successfully' });
  } catch (error) {
    console.log(`Error encountered in api_server.js : ${error}`);
    //console.error('Error adding note:', error);
    res.status(500).json({ error: 'Error adding note' });
  }
});

//Route to delete notes
app.delete('/notes/delete/:user_id/:note_id', async (req, res) => {
  const user = parseInt(req.params.user_id);
  const noteId = parseInt(req.params.note_id);
  try {
    await supabase
    .from('notes_table')
    .delete()
    .eq('user_id', user)
    .eq('note_id', noteId);
    res.status(201).json({ message: 'Note deleted successfully' });
  } catch (error) {
    console.log(`Error encountered in api_server.js : ${error}`);
    res.status(500).json({ error: 'Error deleting note' });
  }
});

//Route to edit notes
app.patch('/notes/edit/:user_id/:note_id', async (req, res) => {
  const user = parseInt(req.params.user_id);
  const note = parseInt(req.params.note_id);
  const { title, content, status } = req.body;
  console.log(`selectedNote is ${note}`);
  try {
    await supabase
    .from('notes_table')
    .update({ 
      note_title: title, 
      note_content: content, 
      datetimedetails: status 
    })
    .eq('note_id', note)
    .eq('user_id', user);
    res.status(201).json({ message: 'Note updated successfully' });
  } catch (error) {
    console.log(`Error encountered in api_server.js : ${error}`);
    res.status(500).json({ error: 'Error updating note' });
  }
});

passport.use(
  new LocalStrategy(async (username, password, done) => {
    try {
      const result = await supabase
      .from('users_table')
      .select('id, user_password')
      .eq('user_email', username);
      //console.log(result.data);
      if (result.data.length > 0) {
        const user = result.data[0];
        //console.log(user)
        if (await bcrypt.compare(password, user.user_password)) {
          return done(null, user);
        } else {
          console.log("User password incorrect");
          return done(null, false);
        }
      } else {
        console.log("User not found");
        return done(null, false);
      }
    } catch (error) {
      done(error);
    }
  })
);

// Serialize user
passport.serializeUser((user, done) => {
  done(null, user);
});


passport.deserializeUser((user, done) => {
  done(null, user);
});


// Start server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
