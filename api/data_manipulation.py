import cv2
import numpy as np
from PIL import Image
import io
import base64
import traceback
from scipy import ndimage
import random as ran
from collections import deque
import time
import xml.etree.cElementTree as ET



def raw_to_pil_image(raw):
    if ('base64' not in raw) or (',' not in raw):
        return None
    idx = raw.index(',')
    imgData = raw[idx+1:]
    fp = io.BytesIO(base64.b64decode(imgData))
    img = Image.open(fp)
    return img

'''
Mask out other obj.
'''
def maskout_others(mask, pos, obj):
    for k, v in pos.items():
        if k != obj:
            classes = pos[obj]
            for k, v in classes.items():
                item = classes[k]
                for coord in item['coords']:
                    mask[coord['y'], coord['x']] = 0


def construct_label(mask, prevDict, obj, clsname, sx, sy):

    coords = np.nonzero(mask)
    pos = prevDict['pos']
    edge = prevDict['edge']

    objPos = pos[obj]
    objEdge = edge[obj]

    clsPos = objPos[clsname]
    clsEdge = objEdge[clsname]


    struct = (3, 3)
    kernel = np.ones(struct)
    dilate = cv2.dilate(mask, kernel, iterations=1)
    edges = mask ^ dilate


    edges_coords = np.nonzero(edges)



    tmp = set()
    for coord in clsPos['coords']:
        tmp.add((coord['x'], coord['y']))

    tmp_edge = set()
    for coord in clsEdge:
        tmp_edge.add((coord['x'], coord['y']))

    for y, x in zip(list(coords[0]), list(coords[1])):
        x = int(sx + x)
        y = int(sy + y)
        if (x, y) in tmp_edge:
            tmp_edge.remove((x, y))
        tmp.add((x, y))

    # Overlap if the pixels are masked by other class
    for k, v in objPos.items():
        if k != clsname:
            otherCls = objPos[k]
            otherSet = set()
            for coord in otherCls['coords']:
                otherSet.add((coord['x'], coord['y']))
            for item in tmp:
                if item in otherSet:
                    otherSet.remove(item)

            otherCls['coords'] = []
            for item in otherSet:
                otherCls['coords'].append({'x': item[0], 'y': item[1]})

    # Remove other class's edges if they are in the mask
    for k, v in objEdge.items():
        if k != clsname:
            otherEdge = objEdge[k]
            otherSet = set()
            for coord in otherEdge:
                otherSet.add((coord['x'], coord['y']))
            for item in tmp:
                if item in otherSet:
                    otherSet.remove(item)

            objEdge[k] = []
            for item in otherSet:
                objEdge[k].append({'x': item[0], 'y': item[1]})

    for y, x in zip(list(edges_coords[0]), list(edges_coords[1])):
        x = int(sx + x)
        y = int(sy + y)
        # ignore the pixel with masks
        if (x, y) not in tmp:
            tmp_edge.add((x, y))

    clsPos['coords'] = []
    for item in tmp:
        clsPos['coords'].append({'x': item[0], 'y': item[1]})

    objEdge[clsname] = []
    for item in tmp_edge:
        objEdge[clsname].append({'x': item[0], 'y': item[1]})


    # try:
    #     output = img.copy()
    #
    #     # Colored segments
    #     maskSeg = np.zeros(img.shape[:2], dtype=np.uint8)
    #     maskSeg[sy:ey, sx:ex] = mask
    #     #maskSeg = mask[:, :, np.newaxis]
    #
    #     start = time.time()
    #     # Edges of mask, credit: http://stackoverflow.com/questions/33742098/border-edge-operations-on-numpy-arrays
    #     struct = (3, 3)
    #     kernel = np.ones(struct)
    #     erode = cv2.erode(maskSeg, kernel, iterations=1)
    #     edges = maskSeg ^ erode
    #
    #     # Expand one more dimension for image operation
    #     maskSeg = maskSeg[:, :, np.newaxis]
    #     segment = maskSeg*colorImg
    #     end = time.time()
    #
    #     print(end-start)
    #
    #     # isEqual = np.equal(segment, prev)
    #     # matchEqual = np.all(isEqual, axis=-1)
    #     # segment[matchEqual, :] = 0
    #     # mask[matchEqual] = 0
    #     #
    #     # isColorEqual = np.equal(prev, colorImg)
    #     # matchColorEqual = np.all(isColorEqual, axis=-1)
    #     # mask[matchColorEqual] = 1
    #
    #     # TODO: Optimize uses indexing
    #     start = time.time()
    #     # credit: http://stackoverflow.com/questions/23077061/numpy-how-to-replace-elements-based-on-condition-or-matching-a-pattern
    #     isOverlap = np.logical_and(prev, segment)
    #     match = np.any(isOverlap, axis=-1)
    #     prev[match, :] = 0
    #
    #     # check overlap of object with segments
    #     isOverlap = np.logical_and(obj, segment)
    #     match = np.any(isOverlap, axis=-1)
    #     obj[match, :] = 0
    #     end = time.time()
    #
    #     print('match overlaps spend: {}'.format(end-start))
    #
    #     # TODO: may need to store in the future
    #     # labelWithoutEdge = np.add(prev, segment)
    #
    #
    #     segment[edges != 0, :] = 255
    #
    #     start = time.time()
    #     # Here is the real label!
    #     labelArr = np.add(prev, segment)
    #     # Object label
    #     objArr = np.add(obj, segment)
    #     end = time.time()
    #
    #     print('add up image and segments spend: {}'.format(end-start))
    #
    #     labelHighlightEdge = np.add(prev, segment)
    #
    #     # Attach label on original picture
    #     isOverlap = np.logical_and(labelHighlightEdge, img)
    #     match = np.any(isOverlap, axis=-1)
    #     img[match, :] = 0
    #
    #
    #
    #     # Image attached with transparent mask
    #     attached = np.add(labelHighlightEdge, img)
    #
    #     # Add transparent
    #     cv2.addWeighted(attached, 0.4, output, 0.6, 0, output)
    #
    #     start = time.time()
    #     labelImg = Image.fromarray(labelArr)
    #     labelWithPic = Image.fromarray(output)
    #     labelObj = Image.fromarray(objArr)
    #     end = time.time()
    #
    #     print("store images: {}".format(end-start))
    #
    #     # start = time.time()
    #     # labelObj.save(str(objID) + 'obj.png')
    #     # end = time.time()
    #     # print("store object: {}".format(end-start))
    #
    #     return labelWithPic, labelImg, labelObj
    # except:
    #     traceback.print_exc()
    #     return None


def construct_color_image(shape, color):
    try:
        r = color['r']
        g = color['g']
        b = color['b']
        blank = np.zeros(shape, dtype=np.uint8)
        blank[:,:,0] = r
        blank[:,:,1] = g
        blank[:,:,2] = b
        return blank
    except:
        traceback.print_exc()
        return None

def connectivity(original, output):
    # Image.fromarray(original * 255).save('bbb.png')
    # Image.fromarray(output * 255).save('aaa.png')
    # print(np.unique(original))
    visited = np.zeros(original.shape, dtype=np.uint8)
    coords = list(zip(*np.where(original == 1)))

    start = ran.choice(coords)

    queue = deque()
    queue.appendleft(start)
    visited[start[0], start[1]] = 1

    print(output.shape)
    while len(queue) != 0:
        y, x = queue.pop()


        if y > 0 and visited[y-1, x] != 1 and output[y-1, x] != 0:
            visited[y-1, x] = 1
            queue.appendleft((y-1, x))
        if y < output.shape[0]-1 and visited[y+1, x] != 1 and output[y+1, x] != 0:
            visited[y+1, x] = 1
            queue.appendleft((y+1, x))
        if x > 0 and visited[y, x-1] != 1 and output[y, x-1] != 0:
            visited[y, x-1] = 1
            queue.appendleft((y, x-1))
        if x < output.shape[1]-1 and visited[y, x+1] != 1 and output[y, x+1] != 0:
            visited[y, x+1] = 1
            queue.appendleft((y, x+1))


    # _connectivity_helper(start[1], start[0], output, visited)

    return visited


def create_xml(data, root):
    for k, v in data.items():
        if isinstance(v, dict):
            node = ET.SubElement(root, k)
            create_xml(v, node)
        elif isinstance(v, list):
            parent = ET.SubElement(root, k)
            if len(v) == 0:
                parent.text = str('[]')
            for idx, item in enumerate(v):
                if isinstance(item, dict):
                    node = ET.SubElement(parent, 'arr'+str(idx))
                    create_xml(item, node)
                else:
                    ET.SubElement(root, 'arr' + str(idx)).text = str(item)
        else:
            #print("{}: {}".format(k, v))
            ET.SubElement(root, k).text = str(v)


def server_pil_image(pil_img):
    img_io = io.BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    base64img = base64.b64encode(img_io.getvalue())
    base64img = base64img.decode('utf-8')
    # return send_file(img_io, mimetype='image/png', attachment_filename="seg.png")
    return base64img
