const express = require('express');
const bcrypt = require('bcrypt');
const path = require('path');
const fs = require('fs');
const ejs = require('ejs');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const { json } = require('body-parser');
const { stringify } = require('querystring');
const e = require('express');

const app = express()

app.set('view engine', 'ejs')
app.use(cookieParser())
app.use(session({
    secret: "buildingblock",
    resave : true,
    saveUninitialized: true,
    cookie : {maxAge : 1000*60*10},
}))
app.use(express.json())



let rawdata = fs.readFileSync('./data/users.json')  // read users
const users = JSON.parse(rawdata)                  // init users as data inside users
rawdata = fs.readFileSync('./data/classes.json')
const classes = JSON.parse(rawdata)
const tokens = []



function jsonifyformdata(formdata) {                // formdata to json format
    formdata = formdata.replaceAll("=", '": "')
    formdata = formdata.replaceAll("&", '","')
    formdata = '{"' + formdata + '"}'
    return formdata
}

// used to clear session's server-set properties                                                                            
function flushsession(session, redirect) {   // redirect(when true: flush redirect also)
    if (redirect) {
        session.redirectCode = undefined     
    }
    session.username = undefined
    session.accounttype = undefined
    session.tokenid = undefined
}

app.get('/data/users', function(req, res) {                  //these are
    res.json(users)                                          //used to
})                                                           //check the

app.get('/data/classes', function(req, res) {                //server's
    res.json(classes)                                        //current
})                                                           //lodaded data

app.get('/', function(req, res) {
    res.redirect('/home')
})

app.get('/home', function(req, res) {
    user_token = tokens.find(user_token => user_token.username === req.session.username)
    if (!req.session.tokenid) {
        req.session.redirectCode = '#01'
        res.redirect('./login')
    } else if (user_token.tokenid !== req.session.tokenid) {
        req.session.redirectCode = '#02'
        req.session.tokenid = undefined
        const user_token = {
            username: req.session.username,
            tokenid: req.session.tokenid
        }
        token_index = tokens.indexOf(user_token)
        tokens.splice(token_index, 1)
        res.redirect('./login')
    } else {
        res.render("home_"+ req.session.accounttype +".ejs", {
            name : req.session.username,
        })
    }
})

app.get('/classes', function(req, res) {

    user_token = tokens.find(user_token => user_token.username === req.session.username)
    if (!req.session.tokenid) {
        req.session.redirectCode = '#01'
        res.redirect('./login')
    } else if (user_token.tokenid !== req.session.tokenid) {
        req.session.redirectCode = '#02'
        req.session.tokenid = undefined
        res.redirect('./login')
    } else {
    
    const curuser = users.find(user => user.username === req.session.username)
    const userid = curuser.userid
    const classdata = []
    if (curuser.accounttype === 'student') {

        for (let i = 0; i < classes.length; i++) {
            if (classes[i].studentids.includes(userid)) {

                const assignments = []

                for (let u = 0; u < classes[i].assignments.length;u++) {

                    if (classes[i].assignments[u].submitted_ids.includes(userid)) {
                        assignments.push({
                            name : classes[i].assignments[u].name,
                            description : classes[i].assignments[u].description,
                            due_date : classes[i].assignments[u].due_date,
                            submission_status : true
                        })
                    } else {
                        assignments.push({
                            name : classes[i].assignments[u].name,
                            description : classes[i].assignments[u].description,
                            due_date : classes[i].assignments[u].due_date,
                            submission_status : false
                        })
                    }
                }

                classdata.push({
                    classname : classes[i].classname,
                    assignments : assignments
                })
            }
        }
        res.render("classes_student.ejs", {
                classdata : classdata,
        })
    } else if (curuser.accounttype === 'teacher') {
        for (let i = 0; i < classes.length; i++) {
            if (classes[i].teacherids.includes(userid)) {
                const assignments = []
                for (let u = 0; u < classes[i].assignments.length;u++) {

                    submission_count = classes[i].assignments[u].submitted_ids.length + "/" + classes[i].studentids.length

                    assignments.push({
                            name : classes[i].assignments[u].name,
                            description : classes[i].assignments[u].description,
                            due_date : classes[i].assignments[u].due_date,
                            submission_count : submission_count
                        })
                }
                classdata.push({
                    classname : classes[i].classname,
                    assignments : assignments
                })
            }
        }
        console.log(classdata)
        res.render("classes_teacher.ejs", {
                classdata : classdata,
        })
    }
}})

app.get('assign', function(req, res) {
    if (!req.session.tokenid) {
        req.session.redirectCode = '#01'
        res.redirect('./login')
    } else if (user_token.tokenid !== req.session.tokenid) {
        req.session.redirectCode = '#02'
        req.session.tokenid = undefined
        const user_token = {
            username: req.session.username,
            tokenid: req.session.tokenid
        }
        token_index = tokens.indexOf(user_token)
        tokens.splice(token_index, 1)
        res.redirect('./login')
    } else {
        res.render("assign.ejs")
    }
})

app.post('/signout', function(req, res) {
    const user_token = {
        username: req.session.username,
        tokenid: req.session.tokenid
    }
    token_index = tokens.indexOf(user_token)
    tokens.splice(token_index, 1)
    flushsession(req.session, true)
    req.session.redirectCode = "#04"
    res.redirect('/login')
})

app.get('/register', function(req, res) {
    res.render("register.ejs")
    req.session.redirectCode = undefined
})

app.get('/login', function(req, res) {
    if (req.session.tokenid) {
        res.redirect("./home")
    } else if (!req.session.redirectCode) {
        res.render("login.ejs",{
            error : ""
        })
    } else if (req.session.redirectCode === "#01") {
        res.render("login.ejs",{
            error : "Please Log In"
        })
    } else if (req.session.redirectCode === "#03") {
        res.render("login.ejs", {
            error : "Successful Registration"
        })
    } else if (req.session.redirectCode === "#04") {
        res.render("login.ejs", {
            error : "Successful Logout"
        })
    } else if (req.session.redirectCode === "#02") {
        const user_token = {
            username: req.session.username,
            tokenid: req.session.tokenid
        }
        token_index = tokens.indexOf(user_token)
        tokens.splice(token_index, 1)
        res.render("login.ejs", {
            error : "Please Re-Log In"
        })
    }
})

app.post('/register', function(req, res) {
    req.on("data", async function (data) {
        data = data.toString()
        data = jsonifyformdata(data)
        data = JSON.parse(data)
        try {
            const hashedpassword = await bcrypt.hash(data.password, 10)
            const user_id = users.length + 1
            const user = {
                username: data.username, 
                password: hashedpassword, 
                userid : user_id, 
                accounttype : data.status}
            users.push(user)
            fs.writeFileSync('./data/users.json', JSON.stringify(users))
            req.session.redirectCode = "#03"
            res.status(201).redirect('./login')
        } catch {
            res.status(500).send()
        }
    })
})

app.post('/login', function(req, res) {
    req.on("data", async function (data) {
        data = data.toString()
        data = jsonifyformdata(data)
        data = JSON.parse(data)
        const user = users.find(user => user.username === data.username)
        if (user == null) {
            return res.status(400).send("incorrect credentials")
        }
        try {
            if(await bcrypt.compare(data.password, user.password)) {
                try {
                    const tokenid = await bcrypt.hash(data.username, 10)
                    const user_token = {username: data.username, tokenid: tokenid}
                    tokens.push(user_token)
                    req.session.tokenid = user_token.tokenid
                    req.session.username = data.username
                    req.session.accounttype = user.accounttype
                    res.redirect("/home")
                } catch {
                    res.status(500).send("server-side issue: code #0000A5")
                }
            } else {
                res.send("incorrect credentials")
            }
        } catch {
                res.status(500).send("server-side issue: code #000A6")
            }
    })
})

app.get('*', function(req, res){
    console.log("404! at", req.url)
    res.status(404).send('what???');
  });

app.listen(8000)