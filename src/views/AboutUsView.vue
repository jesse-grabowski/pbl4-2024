<script setup lang="ts">

</script>

<template>
    <div class="about-us">
      <div class="about-us-image">
        <img src="@/assets/images/about_us_background.jpeg" alt="Ritsumeikan Campus" />
      </div>
      <div class="about-us-content">
        <h2>Who Are We</h2>
        <p>
          Our company is dedicated to offering meaningful services that meet a variety of needs, 
          with a special focus on supporting students. We aim to provide practical and accessible 
          resources to empower our users and enhance their everyday experiences. We’re committed 
          to creating an inclusive environment that promotes growth and opportunity for all. 
          We invite you to learn more about what we do and look forward to welcoming you from the following link.
        </p>
        <button class="btn">See More Details</button>
      </div>
    </div>
  </template>
  
  <style scoped>
  .about-us {    
    flex-grow: 1;
    background-color: #f6f4f4;

    display: grid;
    grid-template-columns: minmax(5rem, auto) 1fr 1fr minmax(5rem, auto);
    grid-template-rows: 1fr min-content 1fr;
    grid-column-gap: 2rem;
    grid-row-gap: 0px;
    padding: 2rem;
  }

  .about-us-image {
    grid-row: 2;
    grid-column: 2;
  }

  .about-us-image img {
    border: 2px solid darkgray;
    border-radius: 10px;
  }

  .about-us-content {
    grid-row: 2;
    grid-column: 3;
  }

  h2 {
    font-size: 3rem;
    font-weight: bold;
    margin-bottom: 2rem;
  }

  p {
    margin: 2rem 0;
  }

  .btn {
    padding: 10px 20px;
    background-color: #d32f2f;
    color: white;
    text-decoration: none;
    border-radius: 9px;
    font-weight: bold;
    border: none;
    font-size: 1rem;
  }

  .btn:hover {
    background-color: #b71c1c;
  }

@media screen and (max-width: 1024px) {
  .about-us {    
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2rem;
  }
}
  </style>
  
