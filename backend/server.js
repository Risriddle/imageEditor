// const express=require('express')
// const app=express()
// const cors=require('cors')
// const sharp = require('sharp');

// app.use(cors())

// //for uploading images to s3
// const multer = require('multer');
// const aws = require('aws-sdk');
// const multerS3 = require('multer-s3');
// const { S3Client } = require('@aws-sdk/client-s3');

// require('dotenv').config()

// const port=process.env.PORT

// const mongoose=require('mongoose')
// const uri=process.env.MONGODB
// mongoose.connect(uri,{
//     useNewUrlParser:true,
//     useUnifiedTopology:true
// })
// .then(()=>{
// console.log("db connected")
// })
// .catch((error)=>{
//     console.log("error connecting to db",error)
// })

// const {Images}=require('./models')

// app.get('/',(req,res)=>{
//     res.send("hi")
// })

// const s3 = new S3Client({
//   region: process.env.AWS_REGION,
//   credentials: {
//     accessKeyId: process.env.AWS_ACCESS_KEY_ID,
//     secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY
//   }
// });
  
  
  
//   // Set up multer with S3
//   const upload = multer({
//     storage: multerS3({
//       s3: s3,
//       bucket: process.env.AWS_BUCKET_NAME,
//       metadata: (req, file, cb) => {
//         cb(null, { fieldName: file.fieldname });
//       },
//       key: (req, file, cb) => {
//         cb(null, Date.now().toString() + '-' + file.originalname);
//       }
//     })
//   });
  

//   // Upload route
//   app.post('/uploadImage', upload.single('image'), (req, res) => {
//     const imageUrl = req.file.location;
//     const newImage=new Images({
//       url:imageUrl
//     })
//     newImage.save()
//     res.send(req.file.location);
//   });


//   const cropSizes = {
//     passport: { width: 200, height: 200 },
//     whatsapp: { width: 640, height: 640 },
//     instagram: { width: 110, height: 110 }
//   };

//   app.post('cropImage',(req,res)=>
//     {const { size } = req.query; 

//   if (!size || !cropSizes[size]) {
//     return res.status(400).send('Invalid crop size');
//   }

//   const { width, height } = cropSizes[size];

//   // Perform image cropping
//   sharp(req.file.path)
//     .resize({ width, height })
//     .toFile(`cropped_${size}.jpg`, (err, info) => {
//       if (err) return res.status(500).send('Error cropping image');
//       // Optionally, delete original uploaded file
//       // fs.unlinkSync(req.file.path);
//       res.send(`Cropped image (${size}) saved successfully`);
//     });
//   })
  


// app.listen(port,()=>{console.log("server running on http://localhost:5000")})


const express = require('express');
const app = express();
const cors = require('cors');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const Jimp = require('jimp');
require('dotenv').config();
const mongoose = require('mongoose');

const port = process.env.PORT;

mongoose.connect(process.env.MONGODB, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
})
.then(() => {
  console.log("DB connected");
})
.catch((error) => {
  console.log("Error connecting to DB", error);
});

const { Images } = require('./models');

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

const upload = multer({
  storage: multerS3({
    s3: s3,
    bucket: process.env.AWS_BUCKET_NAME,
    metadata: (req, file, cb) => {
      cb(null, { fieldName: file.fieldname });
    },
    key: (req, file, cb) => {
      cb(null, Date.now().toString() + '-' + file.originalname);
    },
  }),
});

app.get('/', (req, res) => {
  res.send("hi");
});

app.post('/uploadImage', upload.single('image'), (req, res) => {
  const imageUrl = req.file.location;
  const newImage = new Images({
    url: imageUrl,
  });
  newImage.save()
    .then(() => res.send(imageUrl))
    .catch((error) => res.status(500).send('Error saving image URL to DB'));
});


const cropSizes = {
  passport: { width: 200, height: 200 },
  whatsapp: { width: 640, height: 640 },
  instagram: { width: 110, height: 110 },
};



app.post('/cropImage', upload.single('image'), async (req, res) => {
  const size = req.body.size;
  const imgPath = req.file.location; 

  if (!size || !cropSizes[size]) {
    return res.status(400).send('Invalid crop size');
  }

  const { width, height } = cropSizes[size];

  try {
    // Read and resize the image with Jimp
    const image = await Jimp.read(imgPath);
    image.resize(width, height);

    // Convert to buffer
    const croppedImageBuffer = await image.getBufferAsync(Jimp.MIME_JPEG);

    // Generate a unique filename for the cropped image
    const fileName = `${Date.now()}-${req.file.originalname}`;
    const params = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: fileName,
      Body: croppedImageBuffer,
      ContentType: 'image/jpeg',
     
    };

    // Upload the cropped image to S3
    const putObjectCommand = new PutObjectCommand(params);
    await s3.send(putObjectCommand);

    // Get the URL of the uploaded image
    const croppedImageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${encodeURIComponent(fileName)}`;

    // Save the URL to the database
    const croppedImage = new Images({
      url: croppedImageUrl,
    });

    await croppedImage.save();

    // Delete the temporary image file from the server
    // fs.unlinkSync(imgPath);

    // Send the cropped image URL back to the frontend
    res.send(croppedImageUrl);
  } catch (error) {
    console.error('Error cropping and uploading image:', error);
    res.status(500).send('Error cropping and uploading image');
  }
});


app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
