const { APP_PORT, MONGOOSE_PSW, GMAIL_PSW, GMAIL_EMAIL } = process.env

const express = require('express')
const session = require('express-session')
const app = express()
const helmet = require('helmet')
const bodyParser = require('body-parser')
const urlencodedParser = bodyParser.urlencoded({ extended: false })

const mongoose = require('mongoose')
const passport = require('passport')
const LocalStrategy = require('passport-local').Strategy

const nodemailer = require("nodemailer");

var transporter = nodemailer.createTransport({
	service: 'gmail',
	auth: {
		   user: GMAIL_EMAIL,
		   pass: GMAIL_PSW,
	   }
   });

const User = require('./Models/User')
const Token = require('./Models/Token')


app.use(session({ secret: '<taper-ici-une-phrase-secrete>', resave: false,
	saveUninitialized: false }))
app.use(passport.initialize())
app.use(passport.session())

passport.serializeUser((user, done) => {
	done(null, user);
});
passport.deserializeUser((user, done) => {
	done(null, user)
})

mongoose.set('useFindAndModify', false)
mongoose.connect(`mongodb+srv://test:${MONGOOSE_PSW}@cluster0-bigox.mongodb.net/test?retryWrites=true&w=majority`, {useNewUrlParser: true, useUnifiedTopology: true })

const db = mongoose.connection

db.on('error', console.error.bind(console, 'ERROR: CANNOT CONNECT TO MONGO-DB'))
db.once('open', () => {
    console.log('SUCCESS: CONNECTED TO MONGO-DB')
})

app.use(helmet())
app.set('views', './views')
app.set('view engine', 'pug')
app.use(express.static('public'))

passport.use(new LocalStrategy({
	usernameField: 'email',
    passwordField: 'password'
},
(email, password, done) => {
    User.findOne({ email, password  }, (err, user) => {
        if (err) {
			console.error(err)
            return done(err)
        }
        // Return if user not found in database
        if (!user) {
			console.error('user not found in database')
            return done(null, false, {
                message: 'User not found'
            })
        }
        // Return if password is wrong
        if (!user.validPassword(password) || !user.validEmail(email)) {
			console.error('Error, connection failed')
            return done(null, false, {
                message: 'User not found'
            })
		}
        // If credentials are correct, return the user object
        return done(null, user)
    })
}
))

app.get('/confirm/:token', (req, res) => {
	const { token : tokenLabel } = req.params

	Token.findOne({ label: tokenLabel }, async (err, token) => {
        if (err) {
			console.error(err)
            return done(err)
		}
		try {
			const user = await User.findById(token.userId).select('_id')

			User.updateOne({ _id: user._id }, { $set: { isConfirm: true } })
			.then(() => {
				req.session.isConfirm = true;
				res.redirect(`/user/${user._id}`)
			})
		} catch(err) {
			res.status(404).send(`Page not found`)
		}
    })
})

app.get('/user/delete/:id', async (req, res) => {
	const { id: _id} = req.params

	try {
		const user = await User.findByIdAndDelete(_id)

		if (!user) {
			return res.status(404).send(`Il n’y a pas d’utilisateur ${_id}`)
		}
		return res.send(`L’utilisateur ${user._id} a bien été supprimé`)
	} catch (err) {
		return res.status(500).send('Erreur du serveur')
	}
})

app.get('/signin', (req, res) => {
    res.render('login.pug')
})

app.get('/signup', (req, res) => {
    res.render('register.pug')
})

app.get('/user/:id', (req, res) => {
	const userId = req.params.id

	User.findById(userId).select('name isConfirm')
		.then(user => {
			const { name, isConfirm } = user

			if (!isConfirm)
				return res.status(500).send(`user not confirm`)

			if (req.session.isConfirm) {
				req.session.isConfirm = false
				return res.render('user.pug', {
					message: 'Compte vérifier !',
					userName: name,
				})
			}

			res.render('user.pug', {
				userName: name
			})
		})
		.catch(() => res.status(500).send(`Internal server error`))
})

app.post('/signin', urlencodedParser, passport.authenticate('local', {
	successRedirect: '/user',
	failureRedirect: '/signin'
}))

app.post('/signup', urlencodedParser, async (req, res) => {
	const { email, name, password } = req.body;

	if (!email || !password || !name)
		return res.status(400).send(`empty field`)

	const newUser = new User({ name, email, password })

	try {
		const existingUser = await User.findOne({ name })

		if (existingUser)
			return res.status(400).send(`Le nom ${existingUser.name} est déjà utilisé`)
	} catch (err) {
		return res.status(500).send('Erreur du serveur')
	}
	try {
		const savedUser = await newUser.save()
		const userId = savedUser._id
		const token = new Token({userId: userId})
		const savedToken = await token.save()

		const mailOptions = {
			from: GMAIL_EMAIL, // sender address
			to: email, // list of receivers
			subject: 'Test sending mail with node', // Subject line
			html: `<p> Pour créer votre compte veuillez confirmez votre compte en cliquant ici : <br />
				   http://localhost:3000/confirm/${savedToken.label}</p>`
		};

		transporter.sendMail(mailOptions, (err, info) => {
			if (err)
			  console.log(err)
			else
			  console.log(info);
		 });

		res.status(201).send(`${savedUser.name} on vous a envoyé un mail à l'adresse ${email}`)
	} catch (err) {
		return res.status(500).send('Erreur du serveur')
	}
})

app.get('/user', async (req, res) => {
	if (!req.user)
		return res.redirect('/signin')
	try {
		const users = await User.find({}).select('_id name email')

		return res.render('users.pug', { users })
	} catch (err) {
		return res.status(500).send('Erreur du serveur')
	}
})

app.get('/user/:_id', async (req, res) => {
	const { _id } = req.params
	try {
		const user = await User.findById(_id).select('_id name created')
		return res.send(user)
	} catch (err) {
		console.log(err)
		return res.status(500).send('Erreur du serveur')
	}
})

app.get('*', (req, res) => {
	res.status(404).send('Cette page n’existe pas !')
})



app.listen(APP_PORT, () => console.log('SERVEUR LANCÉ SUR LE PORT ', APP_PORT))