import { generateText } from 'ai';

export default defineEventHandler(async (event) => {

  const form = await readFormData(event)
  const image = form.get('image') as File
  const imageArrayBuffer = await image.arrayBuffer()
  const description = form.get('description') as string

  let imagaData = null;

  await generateText({
    model: 'google/gemini-2.5-flash-image',
    providerOptions: {
      google: { responseModalities: ['TEXT', 'IMAGE'] },
    },
    messages: [
      {
        role: 'user',
        content: [
          {
            type: 'text',
            text: `The image represents colors and shapes of the original image. Try to recreate the original image based on shapes and description: ${description}.`,
          },
          {
            type: 'image',
            image: imageArrayBuffer,
          },
        ],
      },
    ],
  }).then((result) => {
    const generatedImage = result.files[0]
    imagaData = generatedImage.uint8Array
  })

  setResponseHeader(event, 'Content-Type', 'image/jpeg')

  return imagaData
})