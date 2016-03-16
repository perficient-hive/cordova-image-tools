package com.perficient.plugin;

import java.io.File;
import java.util.ArrayList;
import java.util.List;

import org.apache.cordova.*;
import org.json.JSONArray;
import org.json.JSONException;

import org.opencv.calib3d.Calib3d;
import org.opencv.core.Core;
import org.opencv.core.Mat;
import org.opencv.core.MatOfPoint2f;
import org.opencv.core.Size;
import org.opencv.imgproc.Imgproc;
import org.opencv.android.OpenCVLoader;
import org.opencv.android.Utils;

import android.graphics.Bitmap;
import android.graphics.BitmapFactory;
import android.graphics.Matrix;
import android.util.Log;

public class ImageTools extends CordovaPlugin {

    private CallbackContext callbackContext;

    @Override
    public boolean execute(String action, final JSONArray data, final CallbackContext callbackContext) {

        this.callbackContext = callbackContext;

        if (action.equals("measure")) {
            cordova.getThreadPool().execute(new Runnable() {
                @Override
                public void run() {
                    measure(data);
                }
            });
            return true;
        } else {
            Log.v("chromium", "Invalid action passed: " + action);
            return false;
        }
    }

    private void measure(JSONArray data) {
        Log.v("chromium", data.toString());

        String imagePath = "";
        double imageScale = 0.0;
        double canvasZoom = 0.0;
        double firstBarY = 0.0;
        double secondBarY = 0.0;
        double squarePhysicalHeight = 0.0;

        try {
            imagePath   = data.getString(0);
            imageScale  = Double.parseDouble(data.getString(1));
            canvasZoom  = Double.parseDouble(data.getString(2));
            firstBarY   = Double.parseDouble(data.getString(3));
            secondBarY  = Double.parseDouble(data.getString(4));
            squarePhysicalHeight = Double.parseDouble(data.getString(5));
        } catch (JSONException e) {
            e.printStackTrace();
            Log.e("chromium", "JSON Exception");
            this.callbackContext.sendPluginResult(new PluginResult(PluginResult.Status.JSON_EXCEPTION));
            return;
        }

        Log.v("chromium", "imageScale: " + Double.toString(imageScale));
        Log.v("chromium", "canvasZoom: " + Double.toString(canvasZoom));
        Log.v("chromium", "firstBarY: " + Double.toString(firstBarY));
        Log.v("chromium", "secondBarY: " + Double.toString(secondBarY));

        // Android doesn't like the file namespace prefix that browsers use, so remove it :P
        String filePrefix = "file://";
        if (imagePath.startsWith(filePrefix)) {
            imagePath = imagePath.substring(filePrefix.length());
        }
        Log.v("chromium", "imagePath: " + imagePath);

        String message = "";
        try {
            Log.v("chromium", "Welcome to OpenCV: " + Core.VERSION);
            OpenCVLoader.initDebug();


            Log.v("chromium", "Loading image to Bitmap");
            Bitmap bitmap = BitmapFactory.decodeFile(imagePath);

            float degrees = 90.0f;

            Log.v("chromium", "Rotating Bitmap");
            Bitmap rotatedBitmap = rotateImage(bitmap, degrees);

            double imageWidth      = (double) rotatedBitmap.getWidth();
            double imageHeight     = (double) rotatedBitmap.getHeight();

            double maxWidth        = imageWidth  * imageScale;
            double maxHeight       = imageHeight * imageScale;

            Log.v("chromium", "Width: " + maxWidth);
            Log.v("chromium", "Height: " + maxHeight);

            Bitmap scaledBitmap   = Bitmap.createScaledBitmap(rotatedBitmap, (int) maxWidth, (int) maxHeight, true);

            Log.v("chromium", "Converting Bitmap to Mat");
            Mat image = new Mat();
            Utils.bitmapToMat(scaledBitmap, image);


            int numCornersHor = 3;
            int numCornersVer = 3;

            Size boardSize    = new Size(numCornersHor, numCornersVer);
            Mat grayImage     = new Mat();

            MatOfPoint2f cornersV = new MatOfPoint2f();

            Log.v("chromium", "Converting image to grayImage");
            Imgproc.cvtColor(image, grayImage, Imgproc.COLOR_BGR2GRAY);

            Log.v("chromium", "Finding chess board");
            boolean found = Calib3d.findChessboardCorners(grayImage, boardSize, cornersV, Calib3d.CALIB_CB_ADAPTIVE_THRESH | Calib3d.CALIB_CB_FAST_CHECK);
            if(found) {
                List<org.opencv.core.Point> myPoints = cornersV.toList();
                Log.v("chromium", "myPoints: " + myPoints);
                Log.v("chromium", "myPoints size: " + myPoints.size());

                myPoints = sortPoints(myPoints);

                org.opencv.core.Point point1 = myPoints.get(0);
                org.opencv.core.Point point2 = myPoints.get(1);
                org.opencv.core.Point point3 = myPoints.get(3);
                org.opencv.core.Point point4 = myPoints.get(4);

                double distance1 = point2.x - point1.x;
                double distance2 = point4.x - point3.x;
                double distance3 = point3.y - point1.y;
                double distance4 = point4.y - point2.y;

                //org.opencv.core.Point pointA = myPoints.get(0);
                //org.opencv.core.Point pointB = myPoints.get(2);
                //org.opencv.core.Point pointC = myPoints.get(6);
                //org.opencv.core.Point pointD= myPoints.get(8);

                double firstHeight   = distance4;

                // Get average height of checkerboard square
                double averageSquare = Math.abs((distance1+distance2+distance3+distance4)/4.0);


                double distanceBar   = Math.abs(secondBarY - firstBarY);

                // Find distance
                double distanceInSquares = distanceBar / averageSquare;

                Log.v("chromium", "distanceBar: " + distanceBar);
                Log.v("chromium", "firstHeight: " + firstHeight);
                Log.v("chromium", "averageSquare: " + averageSquare);
                Log.v("chromium", "distanceInSquares: " + distanceInSquares);

                double physicalDistance = distanceInSquares * squarePhysicalHeight;
                Log.v("chromium", "squarePhysicalHeight: " + squarePhysicalHeight);
                Log.v("chromium", "physicalDistance: " + physicalDistance);

                message = Double.toString(physicalDistance);
            }
            else {
                message = "Checkerboard not found...";
            }

        }
        catch(Exception e) {
            e.printStackTrace();
            Log.e("chromium", "JSON Exception");
            this.callbackContext.error(e.getMessage());
            return;
        }

        this.callbackContext.success(message);
    }

    private List<org.opencv.core.Point> sortPoints( List<org.opencv.core.Point> sortList) {
        List<org.opencv.core.Point> outList = new ArrayList<org.opencv.core.Point>();
        List<org.opencv.core.Point> outList2 = new ArrayList<org.opencv.core.Point>();
        int g = 0;
        for (int i=0; i<9; i++) {
            int pos = 0;
            org.opencv.core.Point poi = sortList.get(g);
            for (int q=0;q<g;q++) {
                org.opencv.core.Point tPoi = outList.get(q);
                if (poi.y<tPoi.y) {
                    pos=q;
                    break;
                } else
                    pos++;
            }
            g++;
            if (pos>=outList.size()) {
                outList.add(poi);
            } else {
                outList.add(pos, poi);
            }
        }
        for (int row=0; row<3; row++) {
            for (int col=0; col<3; col++) {
                int pos = 0;
                org.opencv.core.Point poi = outList.get((row*3)+col);
                for (int tt=0; tt<col; tt++) {
                    org.opencv.core.Point tPoi = outList2.get((row*3)+tt);
                    if (poi.x<tPoi.x) {
                        pos=tt;
                        break;
                    } else
                        pos++;
                }
                outList2.add((row*3)+pos, poi);
            }
        }

        return outList2;
    }

    private static Bitmap rotateImage(Bitmap bitmap, float degrees) {
        Matrix matrix         = new Matrix();
        matrix.postRotate(degrees);
        Bitmap rotatedBitmap  = Bitmap.createBitmap(bitmap , 0, 0, bitmap.getWidth(), bitmap.getHeight(), matrix, true);

        return(rotatedBitmap);
    }

    private static boolean deleteImage(String imagePath) {
        try {

            File file = new File(imagePath);

            if(file.delete()) {
                System.out.println(file.getName() + " is deleted!");
                return true;
            }
            else {
                System.out.println("Delete operation is failed.");
                return false;
            }
        }
        catch(Exception e) {

            e.printStackTrace();
            return false;
        }
    }
}
