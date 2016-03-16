/*global cordova, module*/

module.exports = {
    measure: function (imagePath, imageScale, canvasZoom, firstBarY, secondBarY, squarePhysicalHeight, successCallback, errorCallback) {
        console.log("Image Path: " + imagePath);
        console.log("Image Scale: " + imageScale);
        console.log("Canvas Zoom: " + canvasZoom);
        console.log("First Bar Y: " + firstBarY);
        console.log("Second Bar Y: " + secondBarY);
        console.log("Square Physical Height: " + squarePhysicalHeight);
        cordova.exec(successCallback, errorCallback, "ImageTools", "measure", [imagePath, imageScale, canvasZoom, firstBarY, secondBarY, squarePhysicalHeight]);
    }
};
