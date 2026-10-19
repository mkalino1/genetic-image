# Genetic Image Evolution

Watch an image emerge from geometric shapes. This web app uses a genetic algorithm to evolve a visual approximation of an image in real time. Then AI can describe the reference image and use that description together with the evolved result to recreate the original image.

[Try it here](https://polyzip.vercel.app)

![App workflow](/public/flow.png)

The genetic algorithm evolve a population of shapes to approximate the image through selection, crossover, and mutation. Then, gpt-5-nano describes the original image, and gemini-3.1-flash-lite-image uses that description and the evolved result to recreate it.

This can serve as an ultra-space-efficient lossy image compression method.

## Features

- **Live evolution:** watch the best approximation improve from one generation to the next.
- **Configurable genetic algorithm:** adjust population size, mutation rate, shapes per individual, and other parameters.
- **Multiple shape types:** evolve circles, rectangles, triangles, or random polygons.
- **Perceptual color scoring:** compare colors using Delta E as part of the fitness function.
- **Parallel processing:** evaluate candidates with Web Workers.
- **LLM integration:** generate a text description of the original, then use it and the evolved image as input for AI image recreation.
- **Canvas rendering:** draw and update results using HTML5 Canvas.
- **Tech stack:** Vue 3, Nuxt 4, and TypeScript.

## How to use it
1. **Upload Your Image** : Drag and drop or select a JPG, JPEG, PNG, GIF, WebP, HEIC, or HEIF image up to 5 MB. Non-square images are center-cropped to a square before evolution.
2. **Tweak the Settings** : Customize evolution parameters like population size, mutation rate, and shapes per individual, or keep the smart defaults.
3. **Start the Evolution** : Hit the start button and watch as colorful geometric shapes come alive, evolving in real-time to mimic your image.
4. **Generate a Description** : Click "Describe" to let AI write a description of the original image.
5. **Recreate** : Finally, click "Recreate" to have another AI recreate the original image from the evolved vector graphics and description.

## How the Magic Happens: The Genetic Algorithm

A genetic algorithm is a technique inspired by the process of natural selection and evolution. It is a metaheuristic algorithm that belongs to the family of evolutionary algorithms. The principle that organisms with better traits are more likely to survive and reproduce was applied to computer science to solve optimization and machine learning problems.

Here's the step-by-step summary of my algorithm:

- **Initialization** : We begin with a random population of shapes scattered across the canvas.
- **Fitness Evaluation** : Each individual (shape collection) gets a score based on how closely it matches your target image, using Delta E comparison.
- **Selection** : The best individuals are chosen as parents using tournament technique, like nature's survival of the fittest.
- **Crossover** : Parents mix their "DNA" traits to create offspring with combined characteristics, hopefully blending the best of both.
- **Mutation** : A dash of randomness introduces new variations, keeping evolution fresh and innovative.
- **Elitism** : The top performers are preserved across generations, ensuring the best traits stick around.

## Why Delta E?

Delta E measures perceptual color difference the way human eyes perceive it, rather than treating RGB values as simple 3D coordinates. Euclidean distance in RGB space doesn't account for the fact that our eyes are more sensitive to certain color changes than others. For example, we notice green shifts more readily than blue ones. By using Delta E, the fitness function produces more visually accurate results that better reflect how closely the evolved shapes match the target image from a human perspective.

![Delta E compared with Euclidean distance](/public/delta_e.png)