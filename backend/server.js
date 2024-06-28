const express = require('express');
const app = express();
const cors = require('cors');
const multer = require('multer');
const aws = require('aws-sdk');
const multerS3 = require('multer-s3');
const { S3Client, DeleteObjectCommand, PutObjectCommand,GetObjectCommand, } = require('@aws-sdk/client-s3');
const Jimp = require('jimp');
require('dotenv').config();
const path = require('path');
const gm = require('gm').subClass({ imageMagick: true });
const { PDFDocument} = require('pdf-lib');
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
  whatsapp: { width: 192, height: 192 },
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

    // Send the cropped image URL back to the frontend
    res.send(croppedImageUrl);

  } catch (error) {
    console.error('Error cropping and uploading image:', error);
    res.status(500).send('Error cropping and uploading image');
  }
});



app.post('/convert', upload.single('image'), async (req, res) => {
  const imageKey = req.file.key; // Key of the uploaded image in S3
  const imageType = req.body.type; // Image type received from request body

  try {
    // Download the image from S3
    const downloadParams = {
      Bucket: process.env.AWS_BUCKET_NAME,
      Key: imageKey,
    };

    const { Body: imageBuffer } = await s3.send(new GetObjectCommand(downloadParams));

    // Convert image buffer to desired type
    gm(imageBuffer)
      .toBuffer(imageType.toUpperCase(), async function(err, convertedBuffer) {
        if (err) {
          console.error('Error converting image:', err);
          return res.status(500).send('Error converting image');
        }

        // Upload converted image buffer to S3
        const uploadParams = {
          Bucket: process.env.AWS_BUCKET_NAME,
          Key: `converted-${Date.now().toString()}.${imageType}`, // Adjust key as needed
          Body: convertedBuffer,
          ContentType: `image/${imageType}`,
        };

        try {
          const data = await s3.send(new PutObjectCommand(uploadParams));
          console.log('Image converted and uploaded to S3:', data);

          // Send the S3 URL of the converted image to frontend
          const imageUrl = `https://${process.env.AWS_BUCKET_NAME}.s3.amazonaws.com/${uploadParams.Key}`;
          res.status(200).json({ imageUrl });
        } catch (err) {
          console.error('Error uploading converted image to S3:', err);
          res.status(500).send('Error uploading converted image to S3');
        }
      });
  } catch (err) {
    console.error('Error processing image conversion and upload:', err);
    res.status(500).send('Error processing image conversion and upload');
  }
});

// Helper function to convert stream to buffer
const streamToBuffer = async (stream) => {
  return new Promise((resolve, reject) => {
    const chunks = [];
    stream.on('data', (chunk) => chunks.push(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

// Route handler to handle multiple image uploads, convert to PDF, and send back
app.post('/toPdf', upload.array('images', 5), async (req, res) => {
  const imageKeys = req.files.map(file => file.key); // Array of image keys in S3

  try {
    // Create a new PDF document
    const pdfDoc = await PDFDocument.create();

    // Iterate through each image key and add to the PDF document
    for (let i = 0; i < imageKeys.length; i++) {
      const imageKey = imageKeys[i];

      // Download the image from S3
      const downloadParams = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: imageKey,
      };
      const { Body: imageStream } = await s3.send(new GetObjectCommand(downloadParams));

      // Convert stream to buffer
      const imageBuffer = await streamToBuffer(imageStream);

      // Determine image type and embed in PDF
      let image;
      if (req.files[i].mimetype === 'image/jpeg') {
        image = await pdfDoc.embedJpg(imageBuffer);
      } else if (req.files[i].mimetype === 'image/png') {
        image = await pdfDoc.embedPng(imageBuffer);
      } else {
        throw new Error('Unsupported image format');
      }

      // Add image to a new page in the PDF document
      const page = pdfDoc.addPage([image.width, image.height]);
      page.drawImage(image, {
        x: 0,
        y: 0,
        width: image.width,
        height: image.height,
      });
    }

    // Serialize PDF to a buffer
    const pdfBytes = await pdfDoc.save();

    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=images.pdf');

    // Send the generated PDF as response
    res.send(Buffer.from(pdfBytes));

  } catch (error) {
    console.error('Error converting images to PDF:', error);
    res.status(500).send('Error converting images to PDF');
  }
});



app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});






















