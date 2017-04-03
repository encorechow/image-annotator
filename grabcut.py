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
    mode = metaData['mode']
    obj = metaData['obj']
    K = 5

    if len(points) <= K:
        return json.dumps({'success':False, 'message': 'Foreground points are not enough.'}), 400, {'ContentType':'application/json'}


    img = raw_to_pil_image(rawData)

    imgArr = np.array(img)
    imgArr = imgArr[:,:,:3]

    obj['object'] = np.zeros(imgArr.shape, dtype=np.uint8) if obj['object'] == None else raw_to_pil_image(obj['object'])
    obj['object'] = np.array(obj['object'])

    colorImg = construct_color_image(imgArr.shape, color)

    if rawPrev == '':
        prev = np.zeros(imgArr.shape, dtype=np.uint8)
    else:
        prev = raw_to_pil_image(rawPrev)
        prev = np.array(prev)
        prev = prev[:,:,:3]

    # Find the part that does not belong to object and set mask to 0
    isPart = np.logical_xor(obj['object'], prev)
    matchPart = np.any(isPart, axis=-1)


    mask = np.zeros(imgArr.shape[:2], dtype=np.uint8)
    if mode == "GrabCut":
        mask.fill(2)
        mask[matchPart] = 0

    # Sum all channel up
    # temp = np.sum(prev, axis=-1)
    # mask[temp != 0] = 0


    bgdModel = np.zeros((1, 65), dtype=np.float64)
    fgdModel = np.zeros((1, 65), dtype=np.float64)

    for point in points:
        x = point['x']
        y = point['y']
        mask[y, x] = 1

    originalMask = np.array(mask)

    if mode == "GrabCut":
        mask, bgdModel,fgdModel = cv2.grabCut(imgArr, mask, None, bgdModel, fgdModel, K, cv2.GC_INIT_WITH_MASK)
        outputMask = np.where((mask == 2)|(mask == 0), 0, 1).astype('uint8')
    elif mode == "Manual":
        outputMask = mask
    else:
        return json.dumps({'success':False, 'message': 'Invalid mode.'}), 400, {'ContentType':'application/json'}

    # rule out the segments that not connected with annotation
    outputMask = connectivity(originalMask, outputMask)


    visual, label, objLabel = construct_label(outputMask, prev, obj, colorImg, imgArr)
    labelImg = server_pil_image(label)
    visualImg = server_pil_image(visual)
    objImg = server_pil_image(objLabel)


    return jsonify({'overlap': visualImg, 'label':labelImg, 'objLabel': objImg})


@app.route("/highlight_obj", methods=['POST'])

def highlight_obj():
    metaData = request.get_json()
    print(metaData)
    return 'Good!'


if __name__ == '__main__':
    app.run(debug=True)
