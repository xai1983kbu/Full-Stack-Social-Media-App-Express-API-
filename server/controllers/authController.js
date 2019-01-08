const mongoose = require('mongoose');
// because we want to use the mongoose model singleton in order to bring in our user model so they can say mongoose top model reference our user model as a string.
const User = mongoose.model('User');
const passport = require('passport');

// in validating our sign of form is to sanitize the inputs to make sure for example the user isn't sending
// over something invalid or something malicious like code that could be saved in our database.
exports.validateSignup = (req, res, next) => {
    // sanitize provided to us on the request with the help of our express validator middleware.
    req.sanitize('name');
    req.sanitize('email');
    req.sanitize('password');

    // Name is non-null and is 4 to 10 characters
    req.checkBody('name', "Enter a name").notEmpty();
    req.checkBody('name', "Name must be between 4 and 10 characters")
        .isLength({ min: 4, max: 10});

    // Email is non-null, valid, and normalized
    req.checkBody('email', 'Enter a valid email')
        .isEmail()
        .normalizeEmail();

    // Password must be non-null and is 4 to 10 characters
    req.checkBody('password', "Enter a name").notEmpty();
    req.checkBody('password', "Password must be between 4 and 10 characters")
        .isLength({ min: 4, max: 10});

    const errors = req.validationErrors();
    if (errors) {
        const firstError = errors.map(errors => errors.msg)[0];
        return res.status(400).send(firstError);
    }
    next();
};

exports.signup = async (req, res,) => {
    const { name, email, password } = req.body;
    const user = await new User({ name, email, password }) //  it won't actually save our password in the database. we don't have --> User({ name, email, password }).save()
    // Now the plug in that we took a look at on the user model called --Passport local mongoose--- will do a couple of things for us
    // First of all it will hash our password it'll turn our password into a long cryptic string.
    // I'll just save this hash and also it will automatically call that save (User().save()) for us so we don't need to persist
    // this new user to our database by calling it save passport local mongoose will do that for us automatically.
    await User.register(user, password, (err, user) => {
        if (err) {
            return res.status(500).send(err.message);
        }
        res.json(user.name);
    })
};

exports.signin = (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
        if (err) {
            return res.status(500).json(err.message)
        }
        if (!user) {
            return res.status(400).json(info.message)
        }

        // Passport exposes a login() function on req (also aliased as logIn()) that can be used to establish a login session.
        // http://www.passportjs.org/docs/login/
        // This function is primarily used when users sign up, during which req.login() can be invoked to automatically log in the newly registered user.
        req.logIn(user, err => {
            if (err) {
                return res.state(500).json(err.message)
            }

            res.json(user)
        })
    // http://www.passportjs.org/docs/authenticate/
    // So in order to provide the requests and response in this inner function this passport authenticate function  you just need to make sure at the end that we call it with the parameters that we have from sign in from our sign in handler which our request response next.
    })(req, res, next);
};

exports.signout = (req, res) => {
    res.clearCookie("next-cookie.sid");
    // Passport exposes a logout() function on req (also aliased as logOut()) that can be called from any route handler which needs to terminate a login session.
    req.logOut()
    res.json({ message: "You are now signed out" })
};

exports.checkAuth = (req, res, next) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/signin');
};
