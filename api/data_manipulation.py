import cv2
import numpy as np
from PIL import Image
import io
import base64
import traceback


def raw_to_pil_image(raw):
    if ('base64' not in raw) or (',' not in raw):
        return None
    idx = raw.index(',')
    imgData = raw[idx+1:]
    fp = io.BytesIO(base64.b64decode(imgData))
    img = Image.open(fp)
    return img

def construct_label(mask, prev, colorImg):
    try:
        segment = mask*colorImg
        # credit: http://stackoverflow.com/questions/23077061/numpy-how-to-replace-elements-based-on-condition-or-matching-a-pattern
        isOverlap = np.logical_and(prev, segment)
        match = np.any(isOverlap, axis=-1)
        prev[match, :] = 0

        labelArr = np.add(prev, segment)
        Image.fromarray(segment).save('segment.png')
        labelImg = Image.fromarray(labelArr)
        return labelImg
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


def server_pil_image(pil_img):
    img_io = io.BytesIO()
    pil_img.save(img_io, 'PNG')
    img_io.seek(0)
    base64img = base64.b64encode(img_io.getvalue())
    # return send_file(img_io, mimetype='image/png', attachment_filename="seg.png")
    return base64img
