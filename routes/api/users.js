// users.js

const express = require("express");
const router = express.Router();
const validateRegisterInput = require('../../validation/register');
const validateLoginInput = require('../../validation/login');
const bcrypt = require("bcryptjs");
const User = require("../../models/User");
const jwt = require("jsonwebtoken");
const keys = require("../../config/keys");
const passport = require("passport");
const mongoose = require("mongoose");


router.get("/", (req, res) => res.json({ msg: "This is the users route" }));


router.post("/register", (req, res) => {
  const { errors, isValid } = validateRegisterInput(req.body);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  User.findOne({ email: req.body.email }).then(user => {
    if (user) {
      errors.email = "User already exists";
      return res.status(400).json(errors);
    } else {
      const newUser = new User({
        handle: req.body.handle,
        email: req.body.email,
        password: req.body.password
      });

      bcrypt.genSalt(10, (err, salt) => {
        bcrypt.hash(newUser.password, salt, (err, hash) => {
          // if (err) throw err;
          newUser.password = hash;
          newUser
            .save()
            .then(user => {
              const payload = { id: user.id, handle: user.handle };

              jwt.sign(
                payload,
                keys.secretOrKey,
                { expiresIn: 3600 },
                (err, token) => {
                  res.json({
                    success: true,
                    token: "Bearer " + token
                  });
                }
              );
            })
            .catch(err => console.log(err));
        });
      });
    }
  });
});

router.post("/login", (req, res) => {
  const { errors, isValid } = validateLoginInput(req.body);

  // console.log(errors);

  if (!isValid) {
    return res.status(400).json(errors);
  }

  // const handle = req.body.handle;
  // look up using email, not handle
  const email = req.body.email; 
  const password = req.body.password;

  User.findOne({ email }).then(user => {
    if (!user) {
      return res.status(404).json({ email: "This user does not exist" });
    }

    bcrypt.compare(password, user.password).then(isMatch => {
      if (isMatch) {
        const payload = { id: user.id, name: user.name };

        jwt.sign(
          payload,
          keys.secretOrKey,
          // Tell the key to expire in one hour
          { expiresIn: 3600 },
          (err, token) => {
            res.json({
              success: true,
              token: "Bearer " + token
            });
          }
        );
      } else {
        return res.status(400).json({ password: "Incorrect password" });
      }
    });
  });
});

router.get(
  "/current",
  passport.authenticate("jwt", { session: false }),
  (req, res) => {
    res.json({
      id: req.user.id,
      handle: req.user.handle,
      email: req.user.email
    });
  }
);

router.get("/:id/recipes", (req, res) => {
  User.findById(req.params.id)
    .then(user => {
      Recipe.find({_id: {$in: user.saved_recipes}})
          .then(objects => {
            res.json(objects)
          })
    })
});

router.post("/:id/recipes", (req, res) => {
  User.findById(req.params.id)
    .then(user => {
      user.saved_recipes.push(Object.keys(req.body)[0]);
      user.save();
      Recipe.find({ _id: { $in: user.saved_recipes } }).then(objects => {
        res.json(objects);
      });
    })
})

router.delete("/:userId/:recipeId", (req, res) => {
  User.findById(req.params.userId)
    .then(user => {
      user.saved_recipes = user.saved_recipes.filter(recipe => (
        recipe != req.params.recipeId
        )
      )
      user.save();
      Recipe.find({ _id: { $in: user.saved_recipes }}).then(objects => {
        res.json(objects);
      });
    })
})

module.exports = router;
