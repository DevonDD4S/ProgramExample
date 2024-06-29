import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import passport from "passport";
import env from "dotenv";
import helmet from 'helmet';
import session from 'express-session';
import nodemailer from 'nodemailer';
import {Strategy as OAuth2Strategy} from 'passport-google-oauth2';
import MemoryStore from 'memorystore';

env.config(); //call the function needed to make your imported secrets work
const app = express();
const PORT = process.env.SYSTEM_PORT;

app.use(bodyParser.urlencoded({extended:true})); //middleware that finds the files im sending to the client
app.set('views','views');
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(helmet());
app.use(bodyParser.json())

const MemoryStoreInstance = MemoryStore(session); // Create a MemoryStore instance

// Use the MemoryStore in your session middleware
app.use(session({
  store: new MemoryStoreInstance({
    checkPeriod: 600000 // Prune expired entries every 10 minutes
  }),
  secret: process.env.SESSION_SECRET, //session secret
  resave: false,
  saveUninitialized: true,
  cookie: {
    secure: false,
    httpOnly: true, // Restricts access to the cookie to HTTP requests only
    sameSite: 'strict', // Prevents the session cookie from being sent in cross-site requests
    maxAge: 10 * 60 * 1000 // Session expiration time in milliseconds (10min)
  },
})); //stores the info of the user
app.use(passport.initialize());
app.use(passport.session());

// Middleware to access the email in routes
app.use((req, res, next) => {
  if (req.isAuthenticated()) {
    res.locals.email = req.user;
  } else {
    res.locals.email = null;
  }
  next();
});

//security
app.use(cors({
  origin: process.env.CORS_ORIGIN, // the allowed origin
  methods: process.env.CORS_METHODS, //what can be done on your website
  optionsSuccessStatus: parseInt(process.env.CORS_SUCCESS_STATUS,10) || 204,
  credentials: process.env.CORS_CREDENTIALS === 'true',
  allowedHeaders: process.env.CORS_ALLOWED_HEADERS,
}));

//security
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

app.post('/send-email', (req,res) => {
  if (req.isAuthenticated()) {
    const {userName,userNumber,userSelect,userEmailText} = req.body
    let userEmail = req.session.passport.user
    sendEmail(userEmail,userName,userNumber,userSelect,userEmailText)
    .then(() => res.redirect('/getStarted'))
    .catch((error) => res.status(500).send(`Error: ${error.message}`))
  } else {
    res.redirect('/getStarted')
  }
})

app.get('/', (req,res) => {
  try {
    res.status(200).render('index') 
  } catch (error) {
    res.status(404).send(`Error displaying homepage: ${error}`)
  }
})

app.get('/getStarted', (req,res) => {
  try {
    if (req.isAuthenticated()) {
      let userEmail = req.session.passport.user
      res.status(200).render('contactUs',{userEmail:userEmail})
    } else {
      res.status(200).render('contactUs')
    }
  } catch (error) {
    res.status(404).send(`Error displaying contactUs page: ${error}`)
  }
})

app.get('/aboutUs', (req,res) => {
  try {
    res.status(200).render('aboutUs')
  } catch (error) {
    console.error('Error displaying the About Us page: ',error)
  }
})

const clientid = process.env.CLIENT_ID
const clientsecret = process.env.CLIENT_SECRET
passport.use(
  new OAuth2Strategy({
    clientID:clientid,
    clientSecret:clientsecret,
    callbackURL:'https://cyberproexample.onrender.com/auth/google/callback',
    scope:['profile','email']
  },
  async(assessToken,refreshToken,profile,done) => {
    try {
      let email = profile.emails[0].value
      return done(null,email)
    } catch (error) {
      return done(error,null)
    }
  }
  )
)
passport.serializeUser((email,done) => {
  done(null,email)
})
passport.deserializeUser((email,done) => {
  done(null,email)
})

//initial google oauth login
app.get('/auth/google',passport.authenticate('google',{scope:['profile','email']}))

app.get('/auth/google/callback',passport.authenticate('google',{
  successRedirect:'/getStarted',
  failureRedirect: '/getStarted'
}))
app.get('/auth/google/callback', (req, res, next) => {
  passport.authenticate('google', (err, user, info) => {
    if (err) {
      console.error('Authentication error:', err);
      return res.redirect('/getStarted?error=' + encodeURIComponent(err.message));
    }
    if (!user) {
      console.log('Authentication failed:', info);
      return res.redirect('/getStarted?error=' + encodeURIComponent(info.message));
    }
    req.logIn(user, (err) => {
      if (err) {
        console.error('Login error:', err);
        return res.redirect('/getStarted?error=' + encodeURIComponent(err.message));
      }
      return res.redirect('/getStarted');
    });
  })(req, res, next);
});


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
      subject: `${userEmail} wants a quote`,
      text: `
        ${userEmail} wants a quote. 
        My name is ${userName}, my number is ${userNumber}, from the 3 SLA choices, I choose ${userSelect}.
        My message to you is: ${userEmailText}
      `,
  }
  await transporter.sendMail(mailOptions)
  } catch (error) {
    console.error('Error sending email: ',error)
    throw err
  }
}

app.listen(PORT, () => {
    console.log(`Server listening on PORT ${PORT}`)
})