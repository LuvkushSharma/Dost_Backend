const express = require('express');
const path = require('path');

const userRouter = require(path.join(__dirname , '/routes/userRoutes'));
const AppError = require ("./utils/appError");
const globalErrorHandler = require(path.join(__dirname , "/controllers/errorController"));


const cookieParser = require('cookie-parser');

const cors = require('cors');
const app = express();

app.use(express.json());


app.use(cookieParser());

const corsOptions = { 
    credentials: true,
    origin: "https://dostfrnd.onrender.com",
    optionsSuccessStatus: 200,
}

app.use(cors(corsOptions))

app.use(express.urlencoded({ extended: true, limit: '10kb' }));

app.use (express.static (path.join (__dirname , 'public')));

app.use('/api/v1/users', userRouter);


// All the URL that gonna not handled before , will be handled here.
app.all('*' , (req , res , next) => {
    
    next(new AppError (`Can't find ${req.originalUrl} on this server` , 404));
  })
  
  
  // ----> Global Error Handling Middleware
  app.use(globalErrorHandler);
  
  
module.exports = app;
