import os
from flask import Flask, render_template, request, json, send_file, jsonify
import numpy as np
import cv2
from PIL import Image
import io
import re
import base64
from api import *


app = Flask(__name__)

@app.route("/")
def home():
    return render_template('generic.html')



@app.route("/handle_action", methods=['POST'])
def handle_action():
    metaData = request.get_json()
    print(metaData.keys())
    rawData = metaData['image']
    rawPrev = metaData['prev']
    color = metaData['color']
    points = metaData['mask']
    K = 5

    if len(points) <= K:
        return json.dumps({'success':False, 'message': 'Foreground points are not enough.'}), 400, {'ContentType':'application/json'}


    img = raw_to_pil_image(rawData)


    imgArr = np.array(img)
    imgArr = imgArr[:,:,:3]

    colorImg = construct_color_image(imgArr.shape, color)

    if rawPrev == '':
        prev = np.zeros(imgArr.shape, dtype=np.uint8)
    else:
        prev = raw_to_pil_image(rawPrev)
        prev = np.array(prev)
        prev = prev[:,:,:3]


    mask = np.zeros(imgArr.shape[:2], dtype=np.uint8)
    mask.fill(2)

    # Sum all channel up
    # temp = np.sum(prev, axis=-1)
    # mask[temp != 0] = 0


    bgdModel = np.zeros((1, 65), dtype=np.float64)
    fgdModel = np.zeros((1, 65), dtype=np.float64)



    for point in points:
        x = point['x']
        y = point['y']
        mask[y, x] = 1

    mask, bgdModel,fgdModel = cv2.grabCut(imgArr, mask, None, bgdModel, fgdModel, K, cv2.GC_INIT_WITH_MASK)

    outputMask = np.where((mask == 2)|(mask == 0), 0, 1).astype('uint8')


    visual, label = construct_label(outputMask, prev, colorImg, imgArr)
    labelImg = server_pil_image(label)
    visualImg = server_pil_image(visual)


    return jsonify({'overlap': visualImg, 'label':labelImg})


if __name__ == '__main__':
    app.run(debug=True)
