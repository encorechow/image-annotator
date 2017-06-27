# Multi-class Image Segments Annotator
This is a web application for custom multi-class annotation. The current applied algorithm in back-end is GrabCut. We may switch to other more efficient algorithms later, but for the sake of completion of the application, we will keep use GrabCut for the moment. There is also a manual mode for fine-tuning.


### Instructions

Since this is still incomplete, I haven't put an dependencies file into repo, which is necessary for running the flask back-end. But if you want to try it, you have to install following python dependencies:

- flask
- PIL
- openCV for python

The project was primarily built up with Javascript, Python flask, jQuery. In terms of jQuery, I used jqtree to implement the tree view of naming system. For more information about jqtree, please go to [jqtree](http://mbraak.github.io/jqTree/). Some of the downloaded Javascript files were not useful in the project. You can just leave them there. Regarding saving files, I used FileSaver.js widget to allow client-side downloading. For more information go to [FileSaver](https://github.com/eligrey/FileSaver.js/).


The structure of project was organized as follow:

- **static**: static files such as Javascript scripts, images, css, sass.

- **template**: HTML webpage file.

- **api**: python scripts that handles server-side algorithm.

- **image**: UI image files.

To run the project, simply type ``` python grabcut.py ``` after download the repo. The prompt will show a local URL. Open up it in the browser to run the application.


### Developer Documentation

#### Template

Developer is not necessary to change code in the generic.html since it is pre-defined template for user interface. In order to add components into the user interface, developer should find the id or class of the parent wrapper and add the components by using jQuery.  There are a lot of functions for appending components. More details can be found on the official documentation of jQuery.


#### imageloader.js

This file contains the ``` ImgLoader ``` class loads the image file into canvas when user drops images. ``` $ele ``` handles all events happened in the drop box.

##### Member functions

###### typeChecks

**Description:** Checks the type of dropped file. Return true if file is an image file.

**Usage:** ``` self.typeChecks(filename) ```. Should use in the ``` init ``` function.

###### reader

**Description:** read the file as ``` FileList ``` object.

###### render

**Description:** render the first image file of ``` FileList ``` into canvas.

###### animations

**Description:** change the background of drop box with animations.

###### hideWrapper

**Description:** Hide the drop box.

###### exposeWrapper

**Description:** Shows up the drop box.




#### annotator.js

This file contains some major data structures:

- **InfoStack**: InfoStack works as normal stack which is first in last out. Two types of InfoStack serve two different purpose. Type 'class' is simply a normal stack with pre-defined maximum number. Type 'history' moves the current index back by one unit instead of remove the element when undo happened. This is in order to keep the contains for redo. The functions in InfoStack data structure are self-explained.


- **AnnoClass**: AnnoClass abstractly represents the class in class panel. The instance of this data structure will be stored into InfoStack. ``` uid ``` member variable is the unique ID of the class. ``` parent ``` member variable is the parent class. ``` subClasses ``` member variable stores all children classes. ``` color ``` member variable defines the color of class. ``` name ``` member variable defines the name of class.

- **Label**: Label abstract data structure depicts the label that responds from server-side by positions of pixels. It stores the color information in the ``` pos ``` member variable as well to show the label on canvas.



##### Annotator




-

#### grabcut.py

#### data_manipulation.py
