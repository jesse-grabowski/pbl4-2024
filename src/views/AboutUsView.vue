<script setup lang="ts">

</script>

<template>
    <div class="container">
      <div class="image-container">
        <img src="@/assets/images/guess/oic-4.jpeg" alt="Ritsumeikan Campus" />
      </div>
      <div class="content">
        <h2>Who Are We</h2>
        <p>
          We are a group of students from Ritsumeikan University, working together
          on a project focused on a gamified activity that is taking place in the
          Osaka Ibaraki Campus of Ritsumeikan. We aim to apply what we have learned
          previously to create this project, and we are excited to share it with
          you!
        </p>
        <button class="btn">Contact Us</button>
      </div>
    </div>
  </template>
  
  <style scoped>
  .container {
    display: flex;
    align-items: center;
    background-color: white;
    padding: 20px;
    border-radius: 10px;
    box-shadow: 0 4px 8px rgba(213, 7, 7, 0.1);
  }
  
  .image-container img {
    width: 2000px;
    height: auto;
    border-radius: 10px;
  }
  
  .content {
    margin-left: 20px;
  }
  
  h2 {
    font-size: 36px;
    font-weight: bold;
    margin: 3;
  }
  
  p {
    font-size: 18px;
    line-height: 1.5;
    margin: 10px 0;
  }
  
  .btn {
    display: inline-block;
    padding: 10px 20px;
    background-color: #d32f2f;
    color: white;
    text-decoration: none;
    border-radius: 9px;
    font-weight: bold;
    border: none;
    cursor: pointer;
    font-size: 16px;
  }
  
  .btn:hover {
    background-color: #b71c1c;
  }
  </style>
  
