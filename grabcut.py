import os
from flask import Flask, make_response, render_template, request, json, send_file, jsonify
import numpy as np
import cv2
from PIL import Image
from io import *
import re
import base64
from api import *
import time
import xml.etree.cElementTree as ET


app = Flask(__name__)




@app.route("/")
def home():
    return render_template('generic.html')



@app.route("/handle_action", methods=['POST'])
def handle_action():
    metaData = request.get_json()
    rawData = metaData['image']
    prevDict = metaData['prev']
    color = metaData['color']
    points = metaData['mask']
    mode = metaData['mode']
    obj = metaData['obj']
    clsname = metaData['cls']
    tool = metaData['tool']
    bbox = metaData['bbox']

    K = 5

    sx, sy, ex, ey = bbox['start_x'], bbox['start_y'], bbox['end_x'], bbox['end_y']
    h, w = ey - sy, ex - sx
    pos = prevDict['pos']
    edge = prevDict['edge']


    if (len(points) <= K and mode == 'GrabCut') or obj == None:
        return json.dumps({'success':False, 'message': 'Foreground points are not enough.'}), 400, {'ContentType':'application/json'}

    # Decode original image to numpy array
    img = raw_to_pil_image(rawData)
    imgArr = np.array(img)
    imgArr = imgArr[:,:,:3]
    imgArrBbox = imgArr[sy:ey, sx:ex, :]



    if obj not in pos:
        pos[obj] = {}
        edge[obj] = {}
        prevDict['numObj'] += 1

    objPos = pos[obj]
    objEdge = edge[obj]


    if clsname not in objPos:
        objPos[clsname] = {'coords': [], 'color': color}
        objEdge[clsname] = []

    clsPos = objPos[clsname]
    clsEdge = objEdge[clsname]




    mask = np.zeros((h, w), dtype=np.uint8)

    if mode == "GrabCut":
        mask.fill(2)
        maskout_others(mask, pos, obj)


    bgdModel = np.zeros((1, 65), dtype=np.float64)
    fgdModel = np.zeros((1, 65), dtype=np.float64)

    for point in points:
        x = point['x'] - sx
        y = point['y'] - sy
        mask[y, x] = 1

    originalMask = np.array(mask)

    print("Start processing...")

    start_t = time.time()
    if mode == "GrabCut":
        mask, bgdModel,fgdModel = cv2.grabCut(imgArrBbox, mask, None, bgdModel, fgdModel, K, cv2.GC_INIT_WITH_MASK)
        outputMask = np.where((mask == 2)|(mask == 0), 0, 1).astype('uint8')
    elif mode == "Manual":
        outputMask = mask
    else:
        return json.dumps({'success':False, 'message': 'Invalid mode.'}), 400, {'ContentType':'application/json'}

    end_t = time.time()
    print("Grabcut done: {}".format(end_t-start_t))
    # rule out the segments that not connected with annotation

    outputMask = connectivity(originalMask, outputMask)

    start_t = time.time()
    construct_label(outputMask, prevDict, obj, clsname, sx, sy)
    end_t = time.time()

    print("Construct label done: {}".format(end_t-start_t))

    return jsonify({'label': prevDict, 'tool':tool})


@app.route("/highlight_obj", methods=['POST'])
def highlight_obj():
    metaData = request.get_json()
    print(metaData)
    return 'Good!'

@app.route("/xml_saver", methods=['POST'])
def xml_saver():
    metaData = request.get_json()
    root = ET.Element("annotator")

    create_xml(metaData, root)
    tree = ET.ElementTree(root)

    f = BytesIO()
    tree.write(f, encoding='utf-8', xml_declaration=True)
    xmlstr = f.getvalue()  # your XML file, encoded as UTF-8
    #tree.write('test.xml')
    response = make_response(xmlstr)
    # This is the key: Set the right header for the response
    # to be downloaded, instead of just printed on the browser
    response.headers["Content-disposition"] = "attachment;"
    response.mimetype="application/xml"

    # tree.write('test.xml')

    return response


if __name__ == '__main__':
    app.run(debug=True)
