const express = require('express');
const app = express();
const methodOverride = require('method-override')
const path = require('path');
const ejsMate = require('ejs-mate');
const mongoose = require('mongoose');
const catchAsync = require('./utils/catchAsync');
const ExpressError = require('./utils/ExpressErrors');
const Forum = require('./models/forum');
const Answer = require('./models/answer');
const session = require('express-session');
const flash = require('connect-flash');

const categories = ['Exam', 'University', 'Engineering', 'Management', 'Programming', 'Placements', 'Other'];

mongoose.connect('mongodb://localhost:27017/College-Forum', {
    useNewUrlParser: true,
    useUnifiedTopology: true
});

const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error:"));
db.once("open", () => {
    console.log("Database connected");
});

app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'))

const sessionConfig = {
    secret: 'thisisasecret',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true,
        expires: Date.now() + 1000 * 60 * 60 * 24 * 7,
        maxAge: 1000 * 60 * 60 * 24 * 7
    }
}
app.use(session(sessionConfig));
app.use(flash());

app.use((req, res, next) => {
    res.locals.success = req.flash('success');
    res.locals.error = req.flash('error');
    next();
})


app.use(express.urlencoded({ extended: true }));
app.use(methodOverride('_method'))
app.use(express.static(path.join(__dirname, 'public')))

app.get('/', (req, res) => {
    res.render('home')
});
app.get('/questions', catchAsync(async (req, res) => {
    const questions = await Forum.find({});
    res.render('Questions/index', { questions });
}));
app.get('/questions/new', (req, res) => {
    res.render('Questions/new', { categories })
});
app.post('/questions', catchAsync(async (req, res) => {
    if (!req.body.question) throw new ExpressError('Invalid Question Data', 400);
    const question = new Forum(req.body.question);
    await question.save();
    req.flash('success', 'We hope you get an Answer soon!');
    res.redirect(`/questions/${question._id}`)
}));
app.get('/questions/:id', catchAsync(async (req, res) => {
    const question = await Forum.findById(req.params.id);
    if (!question) {
        req.flash('error', 'Connot find the Campground!');
        return res.redirect('/questions');
    }
    res.render('Questions/show', { question });
}));
app.get('/questions/:id/edit', catchAsync(async (req, res) => {
    const question = await Forum.findById(req.params.id);
    if (!question) {
        req.flash('error', 'Connot find the Campground!');
        return res.redirect('/questions');
    }
    res.render('Questions/edit', { question, categories });
}));
app.put('/questions/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    const question = await Forum.findByIdAndUpdate(id, { ...req.body.question });
    req.flash('success', 'Successfully edited the Question!')
    res.redirect(`/questions/${question._id}`);
}));
app.delete('/questions/:id', catchAsync(async (req, res) => {
    const { id } = req.params;
    await Forum.findByIdAndDelete(id);
    req.flash('success', 'Successfully deleted the Question!')
    res.redirect('/questions');
}));

app.post('/questions/:id/answers', catchAsync(async (req, res) => {
    const question = await Forum.findById(req.params.id);
    const answer = new Answer(req.body.answer);
    question.answers.push(answer);
    await answer.save();
    await question.save();
    req.flash('success', 'Thankyou For Answering the Question!')
    res.redirect(`/questions/${question._id}`)
}));
app.delete('/questions/:id/answers/:answerId', catchAsync(async (req, res) => {
    const { id, answerId } = req.params;
    await Forum.findByIdAndUpdate(id, { $pull: { answers: answerId } });
    await Answer.findByIdAndDelete(answerId);
    req.flash('success', 'Successfully deleted the Question!')
    res.redirect(`/questions/${id}`);
}))

app.all('*', (req, res, next) => {
    next(new ExpressError('Page Not Found!!', 404));
})

app.use((err, req, res, next) => {
    const { statusCode = 500 } = err;
    if (!err.message) err.message = 'Oh No, Something Went Wrong!!'
    res.status(statusCode).render('error', { err });
})


app.listen(3000, () => {
    console.log('Serving on Port 3000!!!');
})
