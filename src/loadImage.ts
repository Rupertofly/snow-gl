/**
 * Load an image from a given URL
 * @param {String} url The URL of the image resource
 * @returns {Promise<Image>} The loaded image
 */
export function loadImage(url) {
  /*
   * We are going to return a Promise which, when we .then
   * will give us an Image that should be fully loaded
   */
  return new Promise<HTMLImageElement>((resolve) => {
    /*
     * Create the image that we are going to use to
     * to hold the resource
     */
    const image = new Image();
    /*
     * The Image API deals in even listeners and callbacks
     * we attach a listener for the "load" event which fires
     * when the Image has finished the network request and
     * populated the Image with data
     */
    image.addEventListener('load', () => {
      /*
       * You have to manually tell the Promise that you are
       * done dealing with asynchronous stuff and you are ready
       * for it to give anything that attached a callback
       * through .then a realized value.  We do that by calling
       * resolve and passing it the realized value
       */
      resolve(image);
    });
    /*
     * Setting the Image.src is what starts the networking process
     * to populate an image.  After you set it, the browser fires
     * a request to get the resource.  We attached a load listener
     * which will be called once the request finishes and we have
     * image data
     */
    image.src = url;
  });
}
