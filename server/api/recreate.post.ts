import { google } from '@ai-sdk/google'
import { generateText } from 'ai'

export default defineEventHandler(async (event) => {
  const form = await readFormData(event)
  const image = form.get('image') as File
  const description = form.get('description') as string

  const { files } = await generateText({
    model: google('gemini-3.1-flash-lite-image'),
    providerOptions: {
      google: {
        responseModalities: ['TEXT', 'IMAGE'],
        imageConfig: { imageSize: '512' },
      },
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
            type: 'file',
            mediaType: image.type,
            data: await image.arrayBuffer(),
          },
        ],
      },
    ],
  });

  const generatedImage = files.find(file => file.mediaType.startsWith('image/'))
  if (!generatedImage) {
    throw createError({ statusCode: 502, statusMessage: 'Gemini did not return an image.' })
  }

  setResponseHeader(event, 'Content-Type', generatedImage.mediaType)

  return generatedImage.uint8Array
});
