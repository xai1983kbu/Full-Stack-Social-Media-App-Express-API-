const mongoose = require('mongoose');
// then use the mongoose model Singleton and reference the user model
const User = mongoose.model('User');
const multer = require('multer');
const jimp = require('jimp');

exports.getUsers = async (req, res) => {
    const users = await User.find().select('_id name email createdAt updatedAt')
    res.json(users);
};

exports.getAuthUser = (req, res) => {
    if (!req.isAuthUser) {
        return res.status(403).json({
            message: "You are unauthenticated. Please sign in or or sign up"
        });
        return res.redirect('/signin')
    }
    res.json(req.user)
};

exports.getUserById = async (req, res, next, id) => {
    const user = await User.findOne({ _id: id });
    req.profile = user;

    // https://www.udemy.com/universal-react-with-nextjs-the-ultimate-guide/learn/v4/t/lecture/12505228?start=140
    const profileId = mongoose.Types.ObjectId(req.profile._id);
    // https://www.udemy.com/universal-react-with-nextjs-the-ultimate-guide/learn/v4/t/lecture/12505242?start=0
    if (req.user && profileId.equals(req.user._id)) {
        // https://www.udemy.com/universal-react-with-nextjs-the-ultimate-guide/learn/v4/t/lecture/12505228?start=270
        req.isAuthUser = true;
        return next();
    }
    next();
};

exports.getUserProfile = (req, res) => {
    if (!req.profile) {
        return res.status(404).json({
            message: "No user found"
        })
    }
    res.json(req.profile);
};

exports.getUserFeed = async (req, res) => {
    const { following, _id } = req.profile;

    // We want to only want to include in our field users that we're not following.
    // We also want to include anything coming from ourselves.
    // We don't want the ability to follow ourselves.
    following.push(_id);
    const users = await User.find({ _id: { $nin: following } })
        .select('_id name avatar');
    res.json(users)
};

const avatarUploadOptions = {
    storage: multer.memoryStorage(),
    limits: {
        // storing images files up to 1mb
        fileSize: 1024 * 1024 * 1
    },
    fileFilter: (req, file, next) => {
      // check the file MIME type we're going to check the typeof the file that is upload Avatar function is being given.
      if (file.mimetype.startsWith('image/')) {
          // null - not pass an message to uploadAvatar
          // true to move on
          next(null, true);
      } else {
          // false to not move on
          next(null, false);
      }
    }
};

exports.uploadAvatar = multer(avatarUploadOptions).single('avatar'); // And here we need to provide the field name. So this has to match the name of the file input

exports.resizeAvatar = async (req, res, next) => {
    // So multer automatically puts the image on requests on the file property request.
    if (!req.file) {
        return next();
    }
    const extension = req.file.mimetype.split('/')[1]
    req.body.avatar = `/static/uploads/avatars/${req.user.name}-${Date.now()}
    .${extension}`;
    const image = await jimp.read(req.file.buffer);
    await image.resize(250, jimp.AUTO);
    await image.write(`./${req.body.avatar}`);
    next();
};

exports.updateUser = async (req, res) => {
    req.body.updatedAt = new Date().toISOString();
    const updatesUser = await User.findOneAndUpdate(
        { _id: req.user._id},
        // We're going to use the set operator here to put the entire request body on it.
        // So any of the data that we're sending over and the request body will be put onto our user.
        { $set: req.body },
        // In order to ensure that we're not putting any invalid data on our user.
        // We're going to set a property called runValidators and it's set that to true.
        // https://www.udemy.com/universal-react-with-nextjs-the-ultimate-guide/learn/v4/t/lecture/12505240?start=460
        { new: true, runValidators: true }
    );
    res.json(updatesUser)
};

exports.deleteUser = async (req, res) => {
    const { userId } = req.params;
    if (!req.isAuthUser) {
        return res.status(400).json({
            message: "You are not authorized to perform this action"
        })
    }
    const deletedUser = await User.findOneAndDelete({ _id: userId });
    res.json({deletedUser})
};

exports.addFollowing = async (req, res, next) => {
    const { followId } = req.body;

    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $push: { following: followId } }
    );
    next();
};

exports.addFollower = async (req, res) => {
    const { followId } = req.body;

    const user = await User.findOneAndUpdate(
        { _id: followId },
        { $push: { followers: req.user._id } },
        { new: true } // to get the latest record the updated values from the database we can set new to true.
    );
    res.json(user);
};

exports.deleteFollowing = async (req, res, next) => {
    const { followId } = req.body;

    await User.findOneAndUpdate(
        { _id: req.user._id },
        { $pull: { following: followId } }
    );
    next();
};

exports.deleteFollower = async (req, res) => {
    const { followId } = req.body;

    const user = await User.findOneAndUpdate(
        { _id: followId },
        { $pull: { followers: req.user._id } },
        { new: true }
    );
    res.json(user);
};
