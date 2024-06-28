import React from 'react'
import { useState } from 'react'
import axios from 'axios'


const Upload = () => {
    const [image,setImage]=useState('')
    const [url,setUrl]=useState('')
    const [draggedImage, setDraggedImage] = useState(null);

  const handleDragOver = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    event.currentTarget.style.border = '2px dashed blue'; // Example: Highlight border on drag over

  };
  
  const handleDragLeave = (event) => {
    // Optionally, add visual feedback when dragging leaves the drop zone
    event.currentTarget.style.border = '2px dashed #ccc'; // Example: Restore border style on drag leave

  };

  const handleDrop = async (event) => {
    event.preventDefault();
    
    const droppedFiles = Array.from(event.dataTransfer.files);
    if (droppedFiles.length === 0) return;
    
    const file = droppedFiles[0]; 
    setImage(file);
    setDraggedImage(file); 
   
  };

    const upload=async(event)=>{
        if (!image) {
            alert('Please select an image to upload.');
            return;
          }
      
          const formData = new FormData();
          formData.append('image', image);
          

    event.preventDefault();
    try{
    const response=await axios.post('http://localhost:5000/uploadImage',formData,{
        headers: {
            'Content-Type': 'multipart/form-data',
          },
    });
   
    setUrl(response.data)
    console.log('File uploaded successfully:', response.data);

} catch (error) {
  console.error('Error uploading file:', error);
}
    

    }
  return (
    <>
    <div
        style={{
          width: '100%',
          minHeight: '200px',
          border: '2px dashed #ccc',
          borderRadius: '5px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '20px',
          position: 'relative', // Add position relative for image overlay
        }}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
      >
        {draggedImage && (
          <img
            src={URL.createObjectURL(draggedImage)}
            alt="dragged"
            style={{ maxWidth: '100%', maxHeight: '400px', zIndex: 1 }} // Ensure image displays over drop zone
          />
        )}
        {!draggedImage && (
          <p style={{ zIndex: 0 }}>Drag & Drop your image here</p>
        )}
        <input
          type="file"
          accept="image/*"
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            opacity: 0,
            width: '100%',
            height: '100%',
            cursor: 'pointer',
          }}
          onChange={upload}
        />
      </div>
    {/* <div>
      <input name="image" type="file" placeholder='upload image' onChange={(e)=>{setImage(e.target.files[0])}} />
      <button onClick={upload}>UPLOAD</button>
    </div> */}
    {url &&<div>
        <img src={url} alt="uploaded image"></img>
    </div>}
    </>
  )
}

export default Upload



