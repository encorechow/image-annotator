import cv2
import numpy as np
from PIL import Image
import io
import base64
import traceback
from scipy import ndimage


def raw_to_pil_image(raw):
    if ('base64' not in raw) or (',' not in raw):
        return None
    idx = raw.index(',')
    imgData = raw[idx+1:]
    fp = io.BytesIO(base64.b64decode(imgData))
    img = Image.open(fp)
    return img

def construct_label(mask, prev, colorImg, img):
    try:
        output = img.copy()

        # Edges of mask, credit: http://stackoverflow.com/questions/33742098/border-edge-operations-on-numpy-arrays
        struct = ndimage.generate_binary_structure(2, 2)
        erode = ndimage.binary_erosion(mask, struct)
        edges = mask ^ erode

        mask = mask[:, :, np.newaxis]

        # Colored segments
        segment = mask*colorImg

        # highlight edges
        segment[edges==1, :] = 255

        # credit: http://stackoverflow.com/questions/23077061/numpy-how-to-replace-elements-based-on-condition-or-matching-a-pattern
        isOverlap = np.logical_and(prev, segment)
        match = np.any(isOverlap, axis=-1)
        prev[match, :] = 0

        # Here is the really label!
        labelArr = np.add(prev, segment)

        # Attach label on original picture
        isOverlap = np.logical_and(labelArr, img)
        match = np.any(isOverlap, axis=-1)
        img[match, :] = 0

        attached = np.add(labelArr, img)

        # Add transparent
        cv2.addWeighted(attached, 0.4, output, 0.6, 0, output)

        Image.fromarray(output).save('segment.png')
        labelImg = Image.fromarray(labelArr)
        labelWithPic = Image.fromarray(output)


        return labelWithPic, labelImg
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
    base64img = base64img.decode('utf-8')
    # return send_file(img_io, mimetype='image/png', attachment_filename="seg.png")
    return base64img
