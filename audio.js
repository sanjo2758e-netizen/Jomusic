// Example using Cloudinary Node.js SDK backend search
cloudinary.v2.search
  .expression('resource_type:audio') // Cloudinary classifies audio as 'video'
  .max_results(500)                  // 👈 Make sure this is set higher than 5!
  .execute()
  .then(result => console.log(result.resources));