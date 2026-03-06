# Genetic Image Compression

A web application that uses genetic algorithm to recreate target images using evolving geometric shapes, functioning as an ultra-light vector graphics approximation.

Upload any image and watch as the algorithm evolves a population of shapes to match it through iterative selection, crossover, and mutation.

After compression by the genetic algorithm and description by a ChatGPT-5-nano, the result can be recreated by a Gemini-2.5-flash-image.

This enables ultra-light image compression into vector polygons and description, which can then be decompressed into an image resembling the original.

[Try it here](https://polyzip.vercel.app)

## Features

- **Real-time evolution** with live visual updates
- **Configurable parameters** (population size, mutation rate, shapes per individual)
- **Multiple shape types** (circles/rectangles/triangles or random polygons)
- Custom from scratch **genetic algorithm** implementation
- **Delta E** color distance for fitness function
- **Web Workers** for parallel processing
- HTML5 **Canvas** for rendering
- Built with Vue.js 3 + Nuxt 4 + TypeScript

## How to use it
1. **Upload Your Image** : Drag and drop or select any JPG, PNG, or GIF up to 5MB. This will be your target.
2. **Tweak the Settings** : Customize evolution parameters like population size, mutation rate, and shapes per individual, or keep the smart defaults.
3. **Start the Evolution** : Hit the start button and watch as colorful geometric shapes come alive, evolving in real-time to mimic your image.
4. **Generate a Description** : Click "Describe" to let AI write a description of the original image.
5. **Recreate** : Finally, click "Decompress" to have another AI recreate the original image from the evolved vector graphics and description.

## How the Magic Happens: The Genetic Algorithm

A genetic algorithm is a technique inspired by the process of natural selection and evolution. It is a metaheuristic algorithm that belongs to the family of evolutionary algorithms. The principle that organisms with better traits are more likely to survive and reproduce was applied to computer science to solve optimization and machine learning problems.

Here's the step-by-step summary of my algorithm:

- **Initialization** : We begin with a random population of shapes scattered across the canvas.
- **Fitness Evaluation** : Each individual (shape collection) gets a score based on how closely it matches your target image, using Delta E comparison.
- **Selection** : The best individuals are chosen as parents using tournament technique, like nature's survival of the fittest.
- **Crossover** : Parents mix their "DNA" traits to create offspring with combined characteristics, hopefully blending the best of both.
- **Mutation** : A dash of randomness introduces new variations, keeping evolution fresh and innovative.
- **Elitism** : The top performers are preserved across generations, ensuring the best traits stick around.

