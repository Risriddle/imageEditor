const mongoose=require('mongoose')

const Schema=mongoose.Schema


const ImagesSchema=new Schema({
    url: {
        type: String,
        required: true
      },
      createdAt: {
        type: Date,
        default: Date.now
      }
    
})



const Images=mongoose.model('image',ImagesSchema)

module.exports={
Images

}