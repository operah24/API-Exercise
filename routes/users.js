const express = require('express'),
    router = express.Router(),
    bcrypt = require('bcrypt'),
    db = require('../db')
    jwt = require("jsonwebtoken");

const SECRET = "Never make this public";

//Create a new user
router.post('/',async(req, res)=>{
    try{
        const hashedPassword = await bcrypt.hash(req.body.password, 10);
        const data = await db.query("INSERT INTO Users (username, password, isAdmin) VALUES ($1, $2, $3) RETURNING*", [req.body.username, hashedPassword, req.body.adminCode === '12345']);

        return res.status(201).json(data.rows[0]);
    } catch (e){
        return res.status(400).json(e)
    }
});

//Login a user
router.post('/login', async (req, res)=>{
    try{
        const foundUser = await db.query("SELECT * FROM Users WHERE username=$1", [req.body.username]);

        if(foundUser.rows.length === 0){
            return res.status(400).json({
                message: "No User Found"
            })
        }

        const hashedPassword = await bcrypt.compare(req.body.password, foundUser.rows[0].password);
        if(hashedPassword === false){
            return res.json({message:"Invalid"});
        }

        const token = jwt.sign(
            {id: foundUser.rows[0].id, isAdmin:foundUser.rows[0].isadmin},
            SECRET,
            {expiresIn:60 * 60}
        );
        console.log(foundUser.rows[0].isadmin);
        return res.status(200).json(token);
    } catch(e){
        res.status(400).json(e);
    }
});
//Display all users
router.get('/', userLoggedIn, async(req, res) =>{
    try{
        const data = await db.query("SELECT * FROM Users");

        return res. status(200).json(data.rows);
    } catch (e){
        return res.status(400).json({message:"Unauthorized"});
    }
});
//Display one user
router.get('/:id', userLoggedIn, async (req, res)=>{
    try{
        const data= await db.query("SELECT * FROM Users WHERE id=$1", [req.params.id]);
        return res.status(200).json(data.rows);
    } catch (e) {
        return res.status(400).json(e);
    }
});
//Edit username
router.patch('/:id', userLoggedIn, async(req, res)=>{
    try{
        const data = await db.query("UPDATE Users SET username=$1 WHERE id=$2 RETURNING *", [req.body.username, req.params.id]);
        return res.status(200).json(data.rows);
    } catch(e){
        return res.status(400).json(e);
    }
});
//Delete user
router.delete('/:id', userLoggedIn, async(req, res)=>{
    try{
        const data = await db.query("DELETE FROM Users WHERE id=$1", [req.params.id]);
        return res.status(200).json({message:"Successfully Deleted"});
    } catch(e){
        return res.status(400).json(e)
    }
});

function userLoggedIn(req, res, next){
    try{
        const authHead = req.headers.authorization.split(" ")[1];
        const token = jwt.verify(authHead, SECRET);

        if(token.id === req.params.id || token.isAdmin == true){
            return next()
        } else{
            return res.status(400).json({message:"Forbidden"});
        }
    } catch(e){
        return res.status(401).json({message:"Unauthorized"})
    }
    
}


module.exports = router;