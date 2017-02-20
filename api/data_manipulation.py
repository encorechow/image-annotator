import cv2
import numpy as np
from PIL import Image
import io
import base64
import traceback
from scipy import ndimage
import random as ran
from collections import deque


def raw_to_pil_image(raw):
    if ('base64' not in raw) or (',' not in raw):
        return None
    idx = raw.index(',')
    imgData = raw[idx+1:]
    fp = io.BytesIO(base64.b64decode(imgData))
    img = Image.open(fp)
    return img

def construct_label(mask, prev, obj, colorImg, img):
    try:
        output = img.copy()
        # Colored segments
        maskSeg = mask[:, :, np.newaxis]
        segment = maskSeg*colorImg

        # isEqual = np.equal(segment, prev)
        # matchEqual = np.all(isEqual, axis=-1)
        # segment[matchEqual, :] = 0
        # mask[matchEqual] = 0
        #
        # isColorEqual = np.equal(prev, colorImg)
        # matchColorEqual = np.all(isColorEqual, axis=-1)
        # mask[matchColorEqual] = 1


        # Edges of mask, credit: http://stackoverflow.com/questions/33742098/border-edge-operations-on-numpy-arrays
        struct = (3, 3)
        kernel = np.ones(struct)
        erode = cv2.erode(mask, kernel, iterations=1)
        edges = mask ^ erode


        # credit: http://stackoverflow.com/questions/23077061/numpy-how-to-replace-elements-based-on-condition-or-matching-a-pattern
        isOverlap = np.logical_and(prev, segment)
        match = np.any(isOverlap, axis=-1)
        prev[match, :] = 0

        # check overlap of object with segments
        isOverlap = np.logical_and(obj['object'], segment)
        match = np.any(isOverlap, axis=-1)
        obj['object'][match, :] = 0

        # TODO: may need to store in the future
        labelWithoutEdge = np.add(prev, segment)

        segment[edges != 0, :] = 255
        # Here is the really label!
        labelArr = np.add(prev, segment)
        # Object label
        objArr = np.add(obj['object'], segment)

        labelHighlighEdge = np.add(prev, segment)

        # Attach label on original picture
        isOverlap = np.logical_and(labelHighlighEdge, img)
        match = np.any(isOverlap, axis=-1)
        img[match, :] = 0

        # Image attached with transparent mask
        attached = np.add(labelHighlighEdge, img)

        # Add transparent
        cv2.addWeighted(attached, 0.4, output, 0.6, 0, output)

        labelImg = Image.fromarray(labelArr)
        labelWithPic = Image.fromarray(output)
        labelObj = Image.fromarray(objArr)

        labelObj.save(str(obj['id']) + 'obj.png')

        return labelWithPic, labelImg, labelObj
    except:
        traceback.print_exc()
        return None


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

# def _connectivity_helper(x, y, output, visited):
#     if y >= output.shape[0] or y < 0:
#         return
#     if x >= output.shape[1] or x < 0:
#         return
#     if output[y, x] == 0:
#         return
#     if visited[y, x] == 1:
#         return
#
#
#     visited[y, x] = 1
#
#     _connectivity_helper(x+1, y, output, visited)
#     _connectivity_helper(x, y+1, output, visited)
#     _connectivity_helper(x-1, y, output, visited)
#     _connectivity_helper(x, y-1, output, visited)


def server_pil_image(pil_img):
    img_io = io.BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    base64img = base64.b64encode(img_io.getvalue())
    base64img = base64img.decode('utf-8')
    # return send_file(img_io, mimetype='image/png', attachment_filename="seg.png")
    return base64img
