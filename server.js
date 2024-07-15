import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import passport from "passport";
import env from "dotenv";
import helmet from 'helmet';
import session from 'express-session';
import nodemailer from 'nodemailer';
import mongoose from 'mongoose';
import { Strategy as OAuth2Strategy } from 'passport-google-oauth2'; // Import GoogleStrategy
import User from './modules/user.js';

env.config(); //call the function needed to make your imported secrets work
const app = express();
const PORT = process.env.SYSTEM_PORT;

app.use(bodyParser.urlencoded({extended:true})); //middleware that finds the files im sending to the client
app.set('views','views');
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(helmet());
app.use(bodyParser.json())

//security
app.use(cors({
  origin: process.env.CORS_ORIGIN, // the allowed origin
  methods: process.env.CORS_METHODS, //what can be done on your website
  optionsSuccessStatus: parseInt(process.env.CORS_SUCCESS_STATUS,10) || 204,
  credentials: process.env.CORS_CREDENTIALS === 'true',
  allowedHeaders: process.env.CORS_ALLOWED_HEADERS,
}));

//security (CSP)
app.use(async (req, res, next) => {
  try {
    // Set the Content-Security-Policy header
    res.setHeader('Content-Security-Policy', process.env.IMG_SRC_VALUE);
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'deny');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next(); // Move to the next middleware
  } catch(error) {
    console.error("Error getting images to be sent to the header: (2)", error);
    next(error); // Forward the error to the error handling middleware
  }
});

// Use the MemoryStore in your session middleware
app.use(session({
  secret: process.env.SESSION_SECRET, //session secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true, // Restricts access to the cookie to HTTP requests only
    sameSite: 'lax', // Prevents the session cookie from being sent in cross-site requests
    maxAge: 10 * 60 * 1000 // Session expiration time in milliseconds (10min)
  },
})); //stores the info of the user
app.use(passport.initialize());
app.use(passport.session());

//mongoDB URI
const dbURI = process.env.DB_URI;
const connectToMongoDB = async () => {
  try {
    await mongoose.connect(dbURI, { useNewUrlParser: true, useUnifiedTopology: true });
    console.log('Connected to MongoDB...');
  } catch (error) {
    console.log('Error in connecting to MongoDB: ', error);
  }
};

const disconnectFromMongoDB = async () => {
  try {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB...');
  } catch (error) {
    console.log('Error in disconnecting from MongoDB: ', error);
  }
};

app.post('/send-email', (req,res) => {
  const {userEmail,userName,userNumber,userSelect,userEmailText} = req.body
  if (userNumber.length == 10 || userNumber.length == 12) {
    sendEmail(userEmail,userName,userNumber,userSelect,userEmailText)
      .then(() => res.render('contactUs', {message:"Thank you for reaching out", numberMessage:''}))
      .catch((error) => res.status(500).send(`Error: ${error.message}`))
  } else {
    res.render('contactUs', {numberMessage:'Your number is not correct', message:''})
  }
})

app.get('/', (req,res) => {
  try {
    res.status(200).render('index') 
  } catch (error) {
    res.status(404).send(`Error displaying homepage: ${error}`)
  }
})

app.get('/aboutUs', (req,res) => {
  try {
    res.render('aboutUs')
  } catch (error) {
    console.log('Error loading About Us page: ',error)
  }
})

app.get('/getStarted', async (req,res) => {
  try {
    if (req.isAuthenticated()) {
      const loginEmail = req.session.passport.user.email
      res.status(200).render('contactUs', {loginEmail:loginEmail, message:'', numberMessage:''})
    } else {
      res.status(200).render('contactUs')
    }
  } catch (error) {
    res.status(404).send(`Error displaying contactUs page: ${error}`)
  }
})

const sendEmail = async (userEmail,userName,userNumber,userSelect,userEmailText) => {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: "smtp.gmail.com",
      port: 587,
      secure: false, // Use `true` for port 465, `false` for all other ports
      auth: {
        service: 'OAuth2',
        user: process.env.MY_EMAIL,
        clientId: process.env.CLIENT_ID,
        clientSecret: process.env.CLIENT_SECRET,
        pass: process.env.MY_PASSWORD,
      },
  });
  const mailOptions = {
      from: userEmail,
      to: process.env.MY_EMAIL,
      subject: `${userEmail} is requesting a quote`,
      text: `
        Hello,

        ${userEmail} is requesting a quote.

        Name: ${userName}
        Contact Number: ${userNumber}
        Interested In: ${userSelect}

        Message:
        ${userEmailText}

        Best regards,
        ${userName}
      `,
  }
  await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('Error sending email: ',error)
    throw err
  }
}

passport.use(
  new OAuth2Strategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.CALLBACK_URL,
    scope:['profile','email']
  }, async(accessToken, refreshToken, profile, done) => {
    try {
      await connectToMongoDB();
      let user = await User.findOne({googleID:profile.id});
      if (!user) {
        user = new User({
          googleID: profile.id,
          username: profile.displayName,
          email: profile.emails[0].value
        })
        await user.save();
      }
      await disconnectFromMongoDB();
      return done(null,user)
    } catch (error) {
      console.log('Error logging in: ',error)
      return done(error,null)
    }
  })
);

passport.serializeUser((user, cb) => {
  cb(null, user);
});

passport.deserializeUser((user, cb) => {
  cb(null, user)
});

//initial google oauth login
app.get('/auth/google', passport.authenticate('google',{scope: ['profile','email',]}))
app.get('/auth/google/callback',passport.authenticate('google',{
  successRedirect:'/getStarted',
  failureRedirect:'/getStarted'
}))

app.listen(PORT, () => {
  console.log(`Server listening on PORT ${PORT}`)
})