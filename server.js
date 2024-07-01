import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import passport from "passport";
import env from "dotenv";
import helmet from 'helmet';
import session from 'express-session';
import nodemailer from 'nodemailer';

env.config(); //call the function needed to make your imported secrets work
const app = express();
const PORT = process.env.SYSTEM_PORT;

app.use(bodyParser.urlencoded({extended:true})); //middleware that finds the files im sending to the client
app.set('views','views');
app.set('view engine', 'ejs');
app.use(express.static('public')); // Serve static files from the 'public' directory
app.use(helmet());
app.use(bodyParser.json())

// Use the MemoryStore in your session middleware
app.use(session({
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
  const {userEmail,userName,userNumber,userSelect,userEmailText} = req.body
  sendEmail(userEmail,userName,userNumber,userSelect,userEmailText)
    .then(() => res.redirect('/getStarted'))
    .catch((error) => res.status(500).send(`Error: ${error.message}`))
})

app.get('/', (req,res) => {
  try {
    res.status(200).render('index') 
  } catch (error) {
    res.status(404).send(`Error displaying homepage: ${error}`)
  }
})

app.get('/getStarted', async (req,res) => {
  try {
    res.status(200).render('contactUs')
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

app.listen(PORT, () => {
    console.log(`Server listening on PORT ${PORT}`)
})