(function($){
  'use strict';

  function Point(x, y){
    this.x = x;
    this.y = y;
  }

  /**
     * Function to construct annotator
     * @param {int} type       [Type for using this stack]
     * @param {int} limit      [The maximum number of element for the stack]
  */

  function infoStack(type, limit){
    this.curIdx = null;
    this.size = null;
    this.data = [];
    this.limit = limit;
    this.hadUndo = null;
    this.type = type;
    this.sought = false;
    this.init();
  }

  infoStack.prototype = {
    init: function(){
      var self = this;
      self.curIdx = 0;
      self.size = 0;
      self.hadUndo = false;
    },
    getSize: function(){
      var self = this;
      return self.size;
    },
    add: function(item){
      var self = this;
      var flag = self.checkLimit();
      switch(flag){
        case 0:
          return 0;
        case 1:
        // TODO: can be refactored by delete and add function?
          for (var i = 0; i < self.limit-1; i++){
            self.data[i] = self.data[i+1];
          }
          self.data[self.size-1] = item;
          return 1;
        case 2:
          self.data[self.curIdx++] = item;
          if (self.sought){
            for (var i = self.curIdx; i < self.size; i++){
              self.data[i] = null;
            }
            self.size = self.curIdx;
          }else {
            self.size++;
          }
          self.sought = false;
          return 2;
      }

    },

    peek(){
      var self = this;
      return self.data[self.curIdx-1];
    },
    find(idx){
      var self = this;
      return self.data[idx];
    },

    checkLimit: function(){
      var self = this;
      if (self.type == 0 && self.size >= self.limit){
        return 0;
      }else if (self.type == 1 && self.size >= self.limit){
        return 1;
      }
      return 2;
    },

    seek: function(idx){
      var self = this;
      if (idx >= 0 && idx < this.size){
        self.curIdx = idx+1;
        self.sought = true;
      }
    },

    delete: function(idx){
      var self = this;
      if (self.size == 0){
        return false;
      }
      for (var i = idx; i < this.size-1; i++){
        self.data[i] = self.data[i+1];
      }
      self.size--;
      self.curIdx--;
      return true;
    },

    checkDup: function(item){
      var self = this;

      for (var i = 0; i < self.size; i++){
        for (var key in self.data[i]){
          if (self.data[i][key] === item[key]){
            return true;
          }
        }

      }
      return false;
    },

  }

  function State(history, hierarchy, canvasData, imageData){
    this.history = history;
    this.hierarchy = hierarchy;
    this.canvasData = canvasData;
    this.imageData = imageData

  }

  /**
    * annoclass object definition
    * @param {Array}  subClasses    [An array of child classes for the class]
    * @param {int}    level         [Depth of the class]
    * @param {string} color         [Color of the class]
    * @param {string} name          [class name]
    * @param {bool}   selected      [If class is selected or not]
  */

  function AnnoClass(uid, parent, subClasses, color, name){
    this.uid = uid;
    this.parent = parent;
    this.subClasses = subClasses;
    this.color = color;
    this.name = name;
  }

  function Label(){
    this.numObj = 0;
    this.pos = {};
    this.edge = {};
  }


  /**
     * Function to construct annotator
     * @param {DOM} wrapperCanvas         [Canvas wrapping div]
     * @param {string} imgURL             [image URL for rendering to canvas]
     * @param {object} wrapperCanvasCtx   [Canvas Context]
     * @param {array} images              [File objects]
  */

  function Annotator(wrapperCanvas, imgURL, wrapperCanvasCtx, images, overlay){
      this.canvas = wrapperCanvas;
      // canvas that has no scale
      this.nonscaledCanvas = null;
      this.nonscaledCtx = null;
      // overlay
      this.overlay = overlay;
      this.picData = imgURL;
      // current scale
      this.scaleCanvas = 1;
      this.scaleLabel = 1;
      // the click times of zooming buttons for canvas and label
      this.clicksCanvas = 0;
      this.clicksLabel = 0;
      // raw images
      this.images = images;
      // coverted images URL
      this.imagesURL = null;
      this.canvasData = null;
      this.stackType = null;
      this.ctx = wrapperCanvasCtx;
      this.width = wrapperCanvasCtx.canvas.width;
      this.height = wrapperCanvasCtx.canvas.height;
      this.imageData = wrapperCanvasCtx.getImageData(0, 0, wrapperCanvasCtx.canvas.width, wrapperCanvasCtx.canvas.height);
      // current image id
      this.curImgID = 0;
      this.classUid = 0;
      // Array with State object.
      this.states = null;
      // recording stacks
      this.classStack = null;
      //{'image': canvasData, 'tool': string, 'label': labelData, 'overlap': visualization, 'hie': hierarchy}
      this.historyStack = null;
      this.uniqueId = null;
      this.selectedHie = null;
      // {'name': string, 'id': id, 'classes': {'name': string, 'color': string, 'uid', int, 'node': classnode}, 'node': node, 'object': object label}
      this.hierarchyStack = null;
      // ready to send polygon mask or not
      this.sendPoly = null;
      // current zoom factor
      this.curZoomFactor = 1;
      // jQuery element for globally using
      this.$classPanelWrapper = null;
      this.$hisPanelWrapper = null;
      this.$toolKitWrapper = null;
      this.$hierarchyWrapper = null;
      this.$optionsWrapper = null;
      this.$labelWrapper = null;
      this.$editorWrapper = null;
      this.$selectHieFrame = null;
      self.$selectClassFrame = null;
      this.$hieOptions = null;
      self.$historyFrame = null;
      self.$galleryMain = null;
      // {'name': , 'color': }
      this.selectedItem = null;
      // current tool
      this.curTool = null;
      // current Mode
      this.curMode = null;
      // meta data for recording the masked pixels
      this.metaData = null;
      // check if mouse pressed for drawing lines
      this.mousePressed = null;
      // record the point before mouse action
      this.point = null;
      // record the bounding box if any
      this.bbox = null;
      // all polygon points
      this.polygonPoints = null;
      // check if start a polygon draw
      this.polyStarted = null;
      // line width for pen
      this.lineWidth = null;
      // thumbnails' size
      this.thumbWidth = null;
      this.thumbHeight = null;
      this.init();

  }

  Annotator.prototype = {
    init: function(){
      var self = this;
      // initialize state;
      self.mousePressed = false;
      self.polyStarted = false;
      self.point = new Point(0, 0);
      self.polygonPoints = new Array();
      self.states = new Array();
      self.sendPoly = false;
      self.uniqueId = 0;
      self.lineWidth = 0;
      // type of usage of stack.
      self.stackType ={'class': 0, 'history': 1};

      self.canvasData = self.canvas[0].toDataURL();

      // initialize bounding box
      self.bbox = {
          bboxData: null,
          isBox: false,
          start_x: 0,
          start_y: 0,
          end_x: self.width,
          end_y: self.height,
      };


      // working canvas and context, not for visualizing with scale.
      self.nonscaledCanvas = $("<canvas>").attr("width", self.width).attr("height", self.height)[0];
      self.nonscaledCtx = self.nonscaledCanvas.getContext("2d");
      self.nonscaledCtx.putImageData(self.imageData, 0, 0);

      self.classStack = new infoStack(self.stackType['class'], 50);
      self.historyStack = new infoStack(self.stackType['history'], 20);
      self.hierarchyStack = new infoStack(self.stackType['class'], 50);

      self.historyStack.add({
                            image   : self.imageData,
                            tool    : null,
                            label   : new Label(),
                            scale   : self.scaleCanvas,
                            bbox    : $.extend(true, {}, self.bbox),
                            // Add hierarchy info into stack. (deep copy)
                            hie     : null,
                            poly    : new Array(),
                          });

      //radius of click around the first point to close the draw of polygon
      self.POLY_END_CLICK_RADIUS = 10;
      //the max number of points of your polygon
      self.POLY_MAX_POINTS = 8;

      self.$optionsWrapper = $('<div class="optionswrapper panelwrapper "></div>');
      self.$classPanelWrapper = $('<div id="class-tab" class="optionsele panelwrapper"></div>');
      self.$hisPanelWrapper = $('<div class="panelwrapper"></div>');
      self.$toolKitWrapper = $('<div class="toolwrapper"></div>');
      self.$labelWrapper = $('<div id="label-tab" class="labelwrapper mainoptionele"></div>');
      self.$hierarchyWrapper = $('<div id="hierarchy-tab" class="optionsele hierarchywrapper"></div>');
      self.$editorWrapper = $('<div id="editor" class="editor-field"></div>');

      var canvasX = self.canvas.offset().left;
      var canvasY = self.canvas.offset().top;
      var canvOffX = self.canvas.parent().offset().left - canvasX;
      var canvOffY = self.canvas.parent().offset().top - canvasY;

      var canvasW = self.canvas.attr('width');
      var canvasH = self.canvas.attr('height');

      self.thumbWidth = 40;
      self.thumbHeight = 40;


      // Get main div jquery wrapper
      var main = self.canvas.parent().parent().parent();

      // Get canvas wrapper div jquery wrapper
      var canvWrapper = self.canvas.parent();


      /* sub-elements for class panel */
      var titleClass = $('<p class="module-title">Class Panel</p>')
      var nameTextBox = $('<input id="classname" type="text" style="font-size: 20px" name="customclass" placeholder="enter a class name">');
      var addBtn = $('<button id="add" class="decisionBtn">add</button>');
      var addscBtn = $('<button id="addsc" class="decisionBtn">add subclass</button>');
      var errorMsg = $('<p id="errorMsg" class="error" style="display: none"></p>')
      var clearClassBtn = $('<button id="clear" class="decisionBtn">clear</button>');
      var colorSelector = $('#colorSelector');
      var hiddenInput = $('#color_value');
      var selectFrame = $('<div id="selectFrame" class="hierarchy-div"></div>');
      var addToHieBtn = $('<button id="tohie" class="dicisionBtn">add to</button>');
      var hieOptions = $('<select id="hieopt" class="dicisionBtn"></select>');
      var deleteBtn = $('<button id="delete" class="decisionBtn">delete</button>');
      var deleteAllBtn = $('<button id="deleteall" class="decisionBtn">delete all</button>');
      var connectWrapper = $('<div></div>');

      // for being able to globally accessed by functions
      self.$hieOptions = hieOptions;

      self.$selectClassFrame = selectFrame;

      selectFrame.tree({
        data: null,
      });

      connectWrapper.append(addToHieBtn);
      connectWrapper.append(hieOptions);



      var defaultColor = hiddenInput.val();

      self.$classPanelWrapper.append(titleClass);
      self.$classPanelWrapper.append(nameTextBox);
      self.$classPanelWrapper.append(errorMsg);
      self.$classPanelWrapper.append(colorSelector);
      self.$classPanelWrapper.append(hiddenInput);
      self.$classPanelWrapper.append(addBtn);
      self.$classPanelWrapper.append(addscBtn);
      self.$classPanelWrapper.append(clearClassBtn);
      self.$classPanelWrapper.append(selectFrame);
      self.$classPanelWrapper.append(connectWrapper);
      self.$classPanelWrapper.append(deleteBtn);
      self.$classPanelWrapper.append(deleteAllBtn);

      /* sub-elements for history panel*/
      var titleHis = $('<p class="module-title">History Panel</p>')
      var undoBtn = $('<button id="undoHis" class="op-his">undo</button>');
      var redoBtn = $('<button id="redoHis" class="op-his">redo</button>');
      var clearHisBtn = $('<button id="clearHis" class="op-his">clear</button>');
      var historyFrame = $('<table id="historyFrame" class="table table-hover panel-frame"></table>');
      historyFrame.append($('<thead><tr><th>Action</th><th>Thumbnail</th></tr></thead><tbody id="panelBody"></tbody>'))

      // For being able to globally accessed by functions.
      self.$historyFrame = historyFrame;

      self.$hisPanelWrapper.append(titleHis);
      self.$hisPanelWrapper.append(undoBtn);
      self.$hisPanelWrapper.append(redoBtn);
      self.$hisPanelWrapper.append(historyFrame);
      self.$hisPanelWrapper.append(clearHisBtn);


      /* sub-elements for tool kit*/
      var lineWidth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var algorithms = ['GrabCut', 'Manual'];
      var titleTool = $('<p class="module-title">Toolkit</p>')
      var pencil = $('<span class="toolkit-item"><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp Pen</span>');
      var polygon = $('<span class="toolkit-item"><i class="fa fa-map-o" aria-hidden="true"></i>&nbsp Polygon</span>');
      var rectangle = $('<span class="toolkit-item"><i class="fa fa-square-o" aria-hidden="true"></i>&nbsp Rectangle</span>');
      var lineWidthText = $('<br/><span style="font-size:18px;display:inline-block">line width</span>');
      var strokeOptions = $('<select id="selWidth" ></select>');
      var modeText = $('<span style="font-size:18px;display:inline-block">mode</span>');
      var modeOptions = $('<select id="selMode"></select>');


      for (var i = 0; i < lineWidth.length; i++){
        var option = $('<option value=' + lineWidth[i].toString() +'>'+ lineWidth[i].toString() +'</option>');
        strokeOptions.append(option);
      }

      for (var i = 0; i < algorithms.length; i++){
        var mode = $('<option value=' + algorithms[i] + '>' + algorithms[i] + '</option>');
        modeOptions.append(mode);
      }


      self.lineWidth = parseInt(strokeOptions.val());
      self.curMode = modeOptions.val();

      self.$toolKitWrapper.append(titleTool);
      self.$toolKitWrapper.append(pencil);
      self.$toolKitWrapper.append(polygon);
      self.$toolKitWrapper.append(rectangle);

      self.$toolKitWrapper.append(lineWidthText);
      self.$toolKitWrapper.append(strokeOptions);

      self.$toolKitWrapper.append(modeText);
      self.$toolKitWrapper.append(modeOptions);
      /* sub-elements for labelWrapper */
      var labelImg = $('<img id="label-img">')
      labelImg.css({
        'position': 'relative',
        'display': 'block',
        'top': '10%',
        'margin': '0 auto',
      });
      self.$labelWrapper.append(labelImg);



      /* sub-elements for hierarchy */
      var titleHie = $('<p class="module-title">Hierarchy Panel</p>')
      var hieNameTextBox = $('<input id="hiename" type="text" style="font-size: 20px" name="customhie" placeholder="enter a object name">');
      // TODO: change the variables name
      var addHieBtn = $('<button id="addHie" class="decisionBtn add-hie">add</button>');
      var errorHieMsg = $('<p id="errorMsg" class="error" style="display: none"></p>')
      var clearHieBtn = $('<button id="clear" class="decisionBtn">clear</button>');
      var selectHieFrame = $('<div id="selectHieFrame" class="hierarchy-div"></div>');
      var deleteHieBtn = $('<button id="deleteHie" class="decisionBtn">delete</button>');
      var deleteAllHieBtn = $('<button id="deleteAllHie" class="decisionBtn">delete all</button>');
      var addClassToHieBtn = $('<button id="classToHie" class="decisionBtn add-hie">add class</button>')
      var addClassToHieOpt = $('<select id="class-hie-opt" class="dicisionBtn"></select>')

      // for being able to globally accessed by functions
      self.$selectHieFrame = selectHieFrame;



      selectHieFrame.tree({
        data: null,
        onCreateLi: function(node, $li) {
          $li.find('.jqtree-title').after('<div id=hie' + node.id + ' style="display:none;"></div>');
        },
      });

      self.$hierarchyWrapper.append(titleHie);
      self.$hierarchyWrapper.append(hieNameTextBox);
      self.$hierarchyWrapper.append(errorHieMsg);
      self.$hierarchyWrapper.append(addHieBtn);
      self.$hierarchyWrapper.append(clearHieBtn);
      self.$hierarchyWrapper.append(selectHieFrame);
      self.$hierarchyWrapper.append(deleteHieBtn);
      self.$hierarchyWrapper.append(deleteAllHieBtn);



      /* actions for hierarchy panel */
      addHieBtn.on('click', function(){
        var hieName = hieNameTextBox.val();
        var item = {'name': hieName, 'classes': new Array()};
        self.addHierarchy(item, selectHieFrame, errorHieMsg, hieOptions);
        hieNameTextBox.val('');
      });

      hieNameTextBox.on('focus', function(e){
        e.preventDefault();
        errorHieMsg.hide();
      });

      clearHieBtn.on('click', function(e){
        e.preventDefault();
        errorHieMsg.hide();
        hieNameTextBox.val('');
      })

      selectHieFrame.bind('tree.click', function(e){
        e.preventDefault();
        var node = e.node;
        var stack = self.hierarchyStack;
        var item = null;
        if (node['color']){
          var parentNode = node.parent;

          var selectedParent = $(parentNode.element).children('div').hasClass('highlight-hie');

          // Check if current hierarchy has been selected
          if (selectedParent){
            var selectedClass = $(node.element).children('div').hasClass('highlight-class');

            // Remove all highlight of classes
            for (var i = 0; i < parentNode.children.length; i++){
              var child = parentNode.children[i]
              $(child.element).children('div').removeClass('highlight-class');
            }

            // Add the highlight on selected class
            if (!selectedClass){
              $(node.element).children('div').addClass('highlight-class');
              // self.selectedItem = {'name': node['name'], 'color': node['color']}
              self.selectedItem = new AnnoClass(-2, null, null, node['color'], node['name']);
            }else{
              self.selectedItem = null;
            }

          // Selected class is not in current hierarchy
          }else{
            alert('Please select the class in current hierarchy!');
          }

        }else{
          var selected = $(node.element).children('div').hasClass('highlight-hie');

          for (var i = 0; i < stack.getSize(); i++){
            var sibling = stack.find(i);
            // remove the highlight-hie class for hierarchies
            var siblingNode = selectHieFrame.tree('getNodeById', sibling.id);
            $(siblingNode.element).children('div').removeClass('highlight-hie');
            if (sibling.id != node.id){
              var children = siblingNode.children;

              // add the disable-hie class to all children
              for (var j = 0; j < children.length; j++){
                $(children[j].element).children('div').children('span').addClass('disable-hie');
                $(children[j].element).children('div').removeClass('highlight-class');
              }
            }else{
              item = sibling;
            }
          }
          if (!selected){
            $(node.element).children('div').addClass('highlight-hie');
            for (var i = 0; i < node.children.length; i++){
              $(node.children[i].element).children('div').children('span').removeClass('disable-hie');
            }
            self.selectedItem = null;
            self.selectedHie = item;

          }else{
            self.selectedHie = null;
            self.selectedItem = null;
            for (var i = 0; i < stack.getSize(); i++){
              var cur = stack.find(i);
              var curNode = selectHieFrame.tree('getNodeById', cur.id);
              for (var j = 0; j < curNode.children.length; j++){
                $(curNode.children[j].element).children('div').children('span').removeClass('disable-hie');
                $(curNode.children[j].element).children('div').removeClass('highlight-class');
              }
            }
          }

        }
      });

      deleteHieBtn.on('click', function(e){
        e.preventDefault();
        var hie = self.selectedHie;
        var stack = self.hierarchyStack;
        if (!hie){
          alert('Please select a item to delete.');
          return false;
        }



        for (var i = 0; i < stack.getSize(); i++){
          var element = stack.find(i);
            // Find corresponding hierarchy
          if (element['id'] == hie['id']){
            if (self.selectedItem){
              var classes = element['classes'];
              var node = selectHieFrame.tree('getNodeById', element['id']);
              for (var j = 0; j < classes.length; j++){
                // if selected is an class
                if (self.selectedItem.color === classes[j]['color']){

                  // remove from tree
                  var candidate = selectHieFrame.tree('getNodeById', classes[j]['uid']);
                  selectHieFrame.tree('removeNode', candidate);

                  // re-render the color block
                  for (var i = 0; i < node.children.length; i++){
                    var divId = node.children[i].id;
                    var divColor = node.children[i].color;

                    var colorBlock = $('#hie' + divId + '');

                    colorBlock.css({
                      'display': 'inline-block',
                      'width': '20px',
                      'height': '20px',
                      'float': 'right',
                      'margin-right': '20px',
                      'background-color': '#' + divColor,
                    });
                  }
                  $(node.element).children('div').addClass('highlight-hie');

                  // remove from stack
                  classes.splice(j, 1);
                  break;
                }
              }
            // if selected is a hierarchy tab, then remove this hierarchy and its classes
            }else{
              var node = selectHieFrame.tree('getNodeById', element['id']);
              selectHieFrame.tree('removeNode', node);
              self.selectedHie = null;
              hieOptions.find('option').filter(function(i, e){
                return $(e).val() == node.id;
              }).remove();
              stack.delete(i);

              var root = selectHieFrame.tree('getTree');
              var nodes = root['children'];

              for (var k = 0; k < nodes.length; k++){
                var node = nodes[k];
                for (var i = 0; i < node.children.length; i++){
                  var divId = node.children[i].id;
                  var divColor = node.children[i].color;

                  var colorBlock = $('#hie' + divId + '');

                  colorBlock.css({
                    'display': 'inline-block',
                    'width': '20px',
                    'height': '20px',
                    'float': 'right',
                    'margin-right': '20px',
                    'background-color': '#' + divColor,
                  });
                }
              }
            }
            self.selectedItem = null;
            break;
          }
        }

      });

      deleteAllHieBtn.on('click', function(e){
        e.preventDefault();
        self.selectedItem = null;
        self.selectedHie = null;

        self.hierarchyStack = new infoStack(self.stackType['class'], 50);
        self.removeAllHies();
      });


      /* actions for class panel*/
      colorSelector.css({
        'position': 'relative',
        'display': 'block',
        'margin': '0 auto',
        'top': 10,

      });

      nameTextBox.on('focus', function(e){
        e.preventDefault();
        errorMsg.hide();
      });

      hiddenInput.on('change', function(e){
        e.preventDefault();

        // Make text color contrast.
        var hexcolor = $(this).val()
        var textcolor = self.contrastColor(hexcolor);
        colorSelector.css('color',textcolor);

      });

      addscBtn.on('click', function(e){
        e.preventDefault();

        if (self.selectedItem){
          var pickedColor = hiddenInput.val();
          var enteredName = nameTextBox.val();
          var sclasses = new infoStack(self.stackType['class'], 50);
          var superItem = self.selectedItem;
          var item = new AnnoClass(self.classUid++, superItem, sclasses, pickedColor, enteredName);
          self.addAnnoClass(item, superItem, self.$selectClassFrame, errorMsg);
          nameTextBox.val('');
        }else{
          alert('Please select a super-class.')
        }
      });


      addBtn.on('click', function(e){
        e.preventDefault();
        var pickedColor = hiddenInput.val();
        var enteredName = nameTextBox.val();
        var sclasses = new infoStack(self.stackType['class'], 50);
        var item = new AnnoClass(self.classUid++, null, sclasses, pickedColor, enteredName);

        self.addAnnoClass(item, null, self.$selectClassFrame, errorMsg);

        nameTextBox.val('');
      });


      clearClassBtn.on('click', function(e){
        e.preventDefault();
        errorMsg.hide();
        colorSelector.css('background-color', '#' + defaultColor.toString());
        hiddenInput.val(defaultColor);
        nameTextBox.val('');
      });

      addToHieBtn.on('click', function(e){
        e.preventDefault();
        var chosenHie = hieOptions.val();
        self.addSubNode(chosenHie, selectHieFrame);
      });

      deleteBtn.on('click', function(e){
        var candidate = self.selectedItem;
        var node = self.$selectClassFrame.tree('getNodeById', candidate.uid);

        if($(node.element).children('div').hasClass('highlight')){
          self.deleteClass(self.classStack, node);

          self.selectedItem = null;
        }else{
          alert('Please select a class name to delete!');
          return;
        }
      });

      deleteAllBtn.on('click', function(e){
        var stack = [new AnnoClass(-1, null, self.classStack, null, null)];
        var cur, each;
        var children;

        while(cur = stack.pop()){
          children = cur.subClasses;
          for (var i = 0; i < children.getSize(); i++){
            var uid = children.find(i).uid;
            var node = self.$selectClassFrame.tree('getNodeById', uid);
            self.$selectClassFrame.tree('removeNode', node);
          }
        }

        self.classStack = new infoStack(self.stackType['class'], 50);
        self.selectedItem = null;
      });

      // TODO: view
      self.$selectClassFrame.bind('tree.click', function(e){
        e.preventDefault();
        var node = e.node;
        var selected = $(node.element).children('div').hasClass('highlight');

        var stack = [new AnnoClass(-1, null, self.classStack, null, null)];

        var cur, each;
        var children, i;

        while (cur = stack.pop()){
          if (cur.uid == node.id){
            self.selectedItem = cur;
          }

          children = cur.subClasses;
          for (i = 0; i < children.getSize(); i++){
            each = self.$selectClassFrame.tree('getNodeById', children.find(i).uid);
            $(each.element).children('div').removeClass('highlight');
            $(each.element).children('div').css('background-color', '');
            stack.push(children.find(i));
          }
        }
        if (!selected){
          $(node.element).children('div').addClass('highlight');
          $(node.element).children('div').css('background-color', '#' + node.color);
        }else{
          self.selectedItem = null;
        }

      });

      /* actions for toolkit and canvas*/
      $(document).on('click', '.toolkit-item', function(e){
        var selected = $(this).hasClass('highlight');
        $('.toolkit-item').removeClass('highlight');
        if(!selected){
            $(this).addClass('highlight');
            if (self.curTool === 'polygon' && self.polyStarted === true){
              self.polyStarted = false;
              self.drawPolygon(self.ctx);
              self.drawPolygon(self.nonscaledCtx);
              self.mousePressed = false;
              $('#overlay').css('display', 'block');
              var imgInfo = {
                img   : self.nonscaledCtx.getImageData(0, 0, self.width, self.height),
                scale : self.scaleCanvas,
                bbox  : self.bbox,
                poly  : self.polygonPoints,
                clicks: self.clicksCanvas,
              };
              // Add history item
              var info = self.constructRequest();
              var json = JSON.stringify(info);
              self.sendMask(json, imgInfo, historyFrame);
            }
        }
        self.curTool = $(this).text().trim();
        self.metaData = new Array();
      });

      self.canvas.on({
        mousemove: function(e){
          self.handleMousemove(e, this, historyFrame)
        },
        mousedown: function(e){
          self.handleMousedown(e, this, historyFrame);
        },
        mouseup: function(e){
          self.handleMouseup(e, this, historyFrame);

        },
        mouseleave: function(e){
          self.handleMouseleave(e, this, historyFrame);
        }
      });

      strokeOptions.on('change', function(e){
        self.lineWidth = parseInt($(this).val());
      });
      modeOptions.on('change', function(e){
        self.curMode = $(this).val();
      });


      /* history panel actions */
      undoBtn.on('click', function(e){
        self.undoOnce(historyFrame);
      });
      redoBtn.on('click', function(e){
        self.redoOnce(historyFrame);
      });
      clearHisBtn.on('click', function(e){
        self.removeAllHis();
        self.historyStack = new infoStack(self.stackType['history'], 20);
        var bbox = {
            bboxData: null,
            isBox: false,
            start_x: 0,
            start_y: 0,
            end_x: self.width,
            end_y: self.height,
        };
        self.polygonPoints = new Array();
        self.historyStack.add({
                              image   : self.imageData,
                              tool    : null,
                              label   : new Label(),
                              scale   : 1,
                              bbox    : bbox,
                              // Add hierarchy info into stack. (deep copy)
                              hie     : null,
                              poly    : self.polygonPoints,
                            });
        self.renderURL(self.canvasData, null);

      });

      var panelWidth = '14%';
      var mainWidth = main.width();


      // Style of wrappers
      self.$optionsWrapper.css({
        'width': panelWidth,
        'height': '800px',
      });

      self.$editorWrapper.css({
        'display': 'inline-block',
        'margin': '0 auto',
        'position': 'relative',
        'width': '65%',
        'height': '800px',


      });

      self.$classPanelWrapper.css({
        'width': '100%',
        'height': '650px',
      });

      self.$hierarchyWrapper.css({
        'width': '100%',
        'height': '600px',
      })

      self.$hisPanelWrapper.css({
        'width': panelWidth,
        'height': '800px',
      });

      self.$toolKitWrapper.css({
        'position': 'relative',
        'display': 'block',
        'width': '50%',
        'bottom': '50px',
        'height': '200px',
        'margin': '0 auto',
      });
      self.$labelWrapper.css({
        'position': 'relative',
        'display': 'block',
        'background-color': 'black',
        'margin': '0 auto',
        'border-radius':20,
        'height': canvWrapper.height(),
        'overflow': 'auto',
        'width': '100%',
      });


      /* images gallery */
      var exploreWrapper = $('<div id="explorer" class="explorer-wrapper"></div>');
      var galleryWrapper = $('<div id="gallery" class="gallery-wrapper"></div>');
      var galleryMain = $('<div id="gallery-main" class="gallery-content"></div>');
      var leftDiv = $('<div id="left-arrow" class="scroll-left gallery-arrows"><i class="scroll-left-icon fa fa-angle-double-left"></i></div>');
      var rightDiv = $('<div id="right-arrow" class="scroll-right gallery-arrows"><i class="scroll-right-icon fa fa-angle-double-right"></i></div>');

      // For being able to globally accessible by functions
      self.$galleryMain = galleryMain;

      galleryWrapper.append(leftDiv);
      galleryWrapper.append(galleryMain);
      galleryWrapper.append(rightDiv);

      // Loading all images to gallery
      self.loadingGallery();

      $(document).on('click', '.image-item',function(e){
        if (confirm('Do you really what to switch image?')){
          if (self.storeState($(this))){
              self.restoreState($(this));
          }
        }
      });

      leftDiv.on('click', function(){
        self.$galleryMain.animate({
          scrollLeft: '-=200px',
        })
      });

      rightDiv.on('click', function(){
        self.$galleryMain.animate({
          scrollLeft: '+=200px',
        })
      });


      /* File control */
      var fileControlerWarpper = $('<div id="fileControler" class="file-controler-warpper"></div>');
      var addImagesBtn = $('<button class="file-controler-item">add images</button>');
      var hiddenAddBtn = $('<input id="addMore" type="file" name="morepic[]" multiple/>');
      var clearGalleryBtn = $('<button class="file-controler-item">clear gallery</button>');
      var importXMLBtn = $('<button class="file-controler-item">import xml</button>');
      var hiddenImportBtn = $('<input id="importXML" type="file" name="morepic[]" multiple/>');
      var exportXMLBtn = $('<button class="file-controler-item">export XML</button>');
      var saveBtn = $('<button class="file-controler-item">save label</button>');


      fileControlerWarpper.append(addImagesBtn);
      fileControlerWarpper.append(hiddenAddBtn);
      fileControlerWarpper.append(clearGalleryBtn);
      fileControlerWarpper.append(importXMLBtn);
      fileControlerWarpper.append(hiddenImportBtn);
      fileControlerWarpper.append(exportXMLBtn);
      fileControlerWarpper.append(saveBtn);

      exportXMLBtn.on('click', function(e){
        var name = self.images[self.curImgID].name;
        name = name.substring(0, name.lastIndexOf('.'));
        var cache = [];
        var request = {
          //'bbox': self.bbox,
          'label': self.historyStack.peek().label,
          'classStack': self.classStack.data,
          'hierarchyStack': self.hierarchyStack.data,
        }
        var json = JSON.stringify(request, function(key, value){
          if (typeof value === 'object' && value !== null) {
            if (cache.indexOf(value) !== -1) {
            // Circular reference found, discard key
            return;
            }
          // Store value in our collection
            cache.push(value);
          }
          return value;
        });
        cache = null;
        self.sendXMLRequest(json, name);

      });

      saveBtn.on('click', function(e){
        var top = self.historyStack.peek();
        var dict = top.label;
        var url = self.renderDict(dict);
        var pureLabel = self.renderMask(dict);
        //var anchor = $('<a>').attr("href", url).attr("download", "label.png").appendTo("body");
        var anchorMask = $('<a>').attr("href", pureLabel).attr("download", "mask.png").appendTo("body");
        //anchor[0].click();
        anchorMask[0].click();
        //anchor.remove();
        anchorMask[0].remove();
      });

      addImagesBtn.on('click', function(e){
        e.preventDefault();
        hiddenAddBtn.click();
      });

      importXMLBtn.on('click', function(e){
        e.preventDefault();
        hiddenImportBtn.click();
      });

      hiddenAddBtn.on('change', function(e){
        var images = this.files;
        var imagesArr = Array.prototype.slice.call(images)

        var storedImages = self.images;
        var startIdx = storedImages.length;

        for (var i = startIdx; i < startIdx + images.length; i++){
          var rawName = images[i - startIdx].name;
          var block = $('<figure class="image-item"></figure>');
          var thumb = $('<img id="image-' + i.toString() + '" class="image-block" src="static/img/loading.gif"></img>');
          var name = $('<figcaption class="image-name">' + rawName.substr(0, rawName.lastIndexOf('.')) + '</figcaption>');

          block.append(thumb);
          block.append(name);
          galleryMain.append(block);

          (function(file, idx){
            var reader = new FileReader();

            $(reader).load(function(e){
              $('#image-' + idx.toString()).attr('src', e.target.result);
            })
            reader.readAsDataURL(file);
          })(images[i - startIdx], i);

        }
        self.images = self.images.concat(imagesArr);

      });

      hiddenImportBtn.on('change', function(e){
        var files = this.files;
        var file = files[0];
        if (file.type === 'text/xml'){
          var reader = new FileReader();

          reader.onload = function(e){
            var content = this.result;
            var xmlDoc = $.parseXML(content);
            var $xml = $(xmlDoc);
            self.decodeXML($xml);
          }
          reader.readAsText(file);

        }else{
          alert('Please import xml file.');
        }

      });

      clearGalleryBtn.on('click', function(e){
        self.removeAllHis();
        self.removeAllFiles();
        self.clicksCanvas = 0;
        self.clicksLabel = 0;
        self.scaleCanvas = 1;
        self.scaleLabel = 1;
        self.canvas[0].width = 0;
        self.canvas[0].height = 0;
        self.overlay.css('width', 0);
        self.overlay.css('height', 0);
        self.width = 0;
        self.height = 0;
        self.nonscaledCanvas = $("<canvas>").attr("width", self.width).attr("height", self.height)[0];
        self.bbox = {
            bboxData: null,
            isBox: false,
            start_x: 0,
            start_y: 0,
            end_x: self.width,
            end_y: self.height,
        };
        self.polygonPoints = new Array();
        self.historyStack.add({
                              image   : self.imageData,
                              tool    : null,
                              label   : new Label(),
                              scale   : 1,
                              bbox    : $.extend(true, {}, self.bbox),
                              // Add hierarchy info into stack. (deep copy)
                              hie     : null,
                              poly    : self.polygonPoints,
                            });
        self.curImgID = -1;
      });



      /* Tabs for canvas and results*/
      var mainTabsWrapper = $('<div id="mainTabs" class="tabsWrapper"></div>');
      var canvasOption = $('<li class="mainli" ><a href="#wrapperDiv" >Canvas</a></li>');
      var labelOption = $('<li class="mainli" ><a href="#label-tab" >Label</a></li>');
      var mainBar = $('<ul id="mainbar" class="tabs"></ul>');
      var mainSeparator = $('<hr/>');

      /* Zoom in button and Zoom out button */
      var ZoomIn = $('<button id="zoomin" class="zoom">Zoom In</button>');
      var ZoomOut = $('<button id="zoomout" class="zoom">Zoom Out</button>');


      mainBar.append(canvasOption);
      mainBar.append(labelOption);
      mainTabsWrapper.append(ZoomIn);
      mainTabsWrapper.append(mainBar);
      mainTabsWrapper.append(ZoomOut);


      ZoomIn.on('click', function(e){
        e.preventDefault();
        $('#mainTabs ul.tabs li').each(function(index){
          if ($(this).hasClass('active')){
            var opt = $(this).find('a').attr('href');

            // for label zooming
            if (opt === '#label-tab'){
              if (self.clicksLabel < 0){
                self.clicksLabel += 1;
                self.zoomingLabel(1.2, 1);
              }

            }
            // for canvas zooming
            else if (opt === '#wrapperDiv'){
              if (self.clicksCanvas < 0){
                self.clicksCanvas += 1;
                self.zoomingCanvas(1.2, 1);
              }
            }else{
              return;
            }
          }

        });
      });


      ZoomOut.on('click', function(e){
        e.preventDefault();

        $('#mainTabs ul.tabs li').each(function(index){
          if ($(this).hasClass('active')){
            var opt = $(this).find('a').attr('href');
            // for label zooming
            if (opt === '#label-tab'){
              if (self.clicksLabel >= -10){
                self.clicksLabel -= 1;
                self.zoomingLabel(1.2, -1);
              }

            }
            // for canvas zooming
            else if (opt === '#wrapperDiv'){
              if (self.clicksCanvas >= -10){
                self.clicksCanvas -= 1;
                self.zoomingCanvas(1.2, -1);
              }
            }else{
              return;
            }
          }

        });

      });

      self.$editorWrapper.append(mainTabsWrapper);
      self.$editorWrapper.append(separator);
      self.$editorWrapper.append(canvWrapper);
      self.$editorWrapper.append(self.$labelWrapper);
      self.$editorWrapper.append(galleryWrapper);
      self.$editorWrapper.append(fileControlerWarpper);


      /* Tabs for options */
      var tabsWrapper = $('<div id="panelTabs" class="tabsWrapper"></div>');
      var classPanelOption = $('<li><a href="#class-tab">Class</a></li>');
      var hierarchyPanelOption = $('<li><a href="#hierarchy-tab">Object</a></li>');
      var tabsBar = $('<ul class="tabs"></ul>');
      var separator = $('<hr/>');

      tabsBar.append(classPanelOption);
      tabsBar.append(hierarchyPanelOption);
      tabsWrapper.append(tabsBar);



      self.$optionsWrapper.append(tabsWrapper);
      self.$optionsWrapper.append(separator);
      self.$optionsWrapper.append(self.$classPanelWrapper);
      self.$optionsWrapper.append(self.$hierarchyWrapper);
      // append to section
      $('#content').append(self.$editorWrapper);

      self.$toolKitWrapper.insertBefore(self.$editorWrapper);
      self.$optionsWrapper.insertBefore(self.$editorWrapper);
      self.$hisPanelWrapper.insertAfter(self.$editorWrapper);




      panelWidth = self.$optionsWrapper.width();
      // offset is calculated by the width of main div substract the width of canvas and two panels,
      // then divided by 2. This is distance between canvas and panels. 20 bias term for move inside a little bit.
      var offset = (mainWidth - self.$editorWrapper.width() - 2 * panelWidth) / 2 - 20;

      self.$optionsWrapper.css('right', offset);
      self.$hisPanelWrapper.css('left', offset);

      $(window).resize(function() {
        var mainWidth = main.width();
        var panelWidth = self.$optionsWrapper.width();
        var offset = (mainWidth - self.$editorWrapper.width() - 2 * panelWidth) / 2 - 20;
        self.$optionsWrapper.css('right', offset);
        self.$hisPanelWrapper.css('left', offset);
      });


      // Switch between tabs
      $('#panelTabs ul.tabs li:first').addClass('active');
      self.$hierarchyWrapper.hide();
      self.$classPanelWrapper.show();
      $('#panelTabs ul.tabs li').on('click',function(){
        $('#panelTabs ul.tabs li').removeClass('active');
        $(this).addClass('active')
        $('.optionsele').hide();
        var activeTab = $(this).find('a').attr('href');
        $(activeTab).show();

        // Initialize all state of the table.
        self.initializeOptionPanel();
        return false;
      });


      // Switch between canvas and result
      $('#mainTabs ul.tabs li:first').addClass('active');
      self.$labelWrapper.hide();
      canvWrapper.show();

      $('#mainTabs ul.tabs li').on('click',function(){
        $('#mainTabs ul.tabs li').removeClass('active');
        $(this).addClass('active')
        $('.mainoptionele').hide();
        var activeTab = $(this).find('a').attr('href');
        $(activeTab).show();

        if(activeTab === '#label-tab'){
          galleryWrapper.hide();
        }else{
          galleryWrapper.show();
        }
        return false;
      });


      self.overlay.css({
        'margin': self.canvas.css('margin'),
      });

    },
    zoomingLabel: function(scaleFactor, exp){
      var self = this;
      var factor = Math.pow(scaleFactor, exp);
      self.scaleLabel *= factor;

      var newWidth = self.width * self.scaleLabel;
      var newHeight = self.height * self.scaleLabel;

      $('#label-img').css({
        width: newWidth,
        height: newHeight,
      });
    },

    zoomingCanvas: function(scaleFactor, exp){
      var self = this;
      var factor = Math.pow(scaleFactor, exp);
      var stack = self.historyStack;
      //var previousScale = self.scaleCanvas;

      var divergence = Math.round(1 / self.scaleCanvas);
      if (self.bbox.isBox){
        self.ctx.putImageData(self.bbox.bboxData,
          (self.bbox.start_x * self.scaleCanvas)-divergence,
          (self.bbox.start_y * self.scaleCanvas)-divergence);
      }
      self.scaleCanvas *= factor
      var newWidth = self.width * self.scaleCanvas;
      var newHeight = self.height * self.scaleCanvas;


      self.ctx.canvas.width = newWidth;
      self.ctx.canvas.height = newHeight;
      var margin = self.canvas.css('margin');


      var peek = stack.peek();

      var copiedCanvas = $('<canvas>').attr({
        width: self.width,
        height: self.height,
      })[0];
      copiedCanvas.getContext("2d").putImageData(peek.image, 0, 0);

      self.ctx.scale(self.scaleCanvas, self.scaleCanvas);
      self.ctx.clearRect(0, 0, self.width, self.height);
      self.ctx.drawImage(copiedCanvas, 0, 0);

      self.overlay.css({
        'width': Math.floor(newWidth),
        'height': Math.floor(newHeight),
        'margin': margin,
      });

      if (self.bbox.isBox){
        var start_x = self.bbox.start_x * self.scaleCanvas;
        var start_y = self.bbox.start_y * self.scaleCanvas;
        var end_x = self.bbox.end_x * self.scaleCanvas;
        var end_y = self.bbox.end_y * self.scaleCanvas;
        divergence = Math.round(1 / self.scaleCanvas);

        self.bbox.bboxData = self.ctx.getImageData(start_x-divergence,
          start_y-divergence, end_x+divergence, end_y+divergence);

        var h = self.bbox.end_y - self.bbox.start_y;
        var w = self.bbox.end_x - self.bbox.start_x;

        var gradient=self.ctx.createLinearGradient(self.bbox.start_x,
                      self.bbox.start_y, self.bbox.end_x,self.bbox.end_y);
        gradient.addColorStop("0","magenta");
        gradient.addColorStop("0.5","blue");
        gradient.addColorStop("1.0","red");


        self.ctx.lineWidth = divergence;
        self.ctx.strokeStyle = gradient;
        self.ctx.strokeRect(self.bbox.start_x, self.bbox.start_y , w, h);

      }
    },

    removeAllHis: function(){
      var self = this;
      self.$historyFrame.find('tr').each(function(index){
        if (index != 0){
          $(this).remove();
        }
      });
    },
    removeAllHies: function(){
      var self = this;
      var tree = self.$selectHieFrame.tree('getTree');
      var children = tree['children'];

      // Remove all nodes in hierarchy
      while (children.length != 0){
        self.$selectHieFrame.tree('removeNode', children[children.length-1]);
      }

      // Remove options in select tag
      self.$hieOptions.find('option').remove();
    },
    removeAllFiles: function(){
      var self = this;
      self.images.length = 0;

      var gallery = self.$galleryMain;
      gallery.find('figure').each(function(index){
        $(this).remove();
      });
    },

    initializeOptionPanel: function(){
      var self = this;
      self.$hierarchyWrapper.find('.highlight-hie').removeClass('highlight-hie');
      self.$classPanelWrapper.find('.highlight').removeClass('highlight');
      self.$hierarchyWrapper.find('.disable-hie').removeClass('disable-hie');
      self.$hierarchyWrapper.find('.highlight-class').removeClass('highlight-class');

      if (self.selectedItem && self.selectedItem.uid >= 0){
        var node = self.$selectClassFrame.tree('getNodeById', self.selectedItem.uid);
        $(node.element).children('div').css('background-color', '');
      }

      self.selectedItem = null;
      self.selectedHie = null;
    },
    addHisFromState: function(history, imgURL, state){
      var self = this;
      self.historyStack = $.extend(true, new infoStack(self.stackType['history'], 20), history);
      for (var i = 1; i < history.getSize(); i++){
        var his = history.find(i);

        var hisCell = $('<tr class="hisCell" id=' + i.toString() + '><td>'
        + his['tool'] + '</td><td><img src="'
        + imgURL +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');

        self.$historyFrame.prepend(hisCell);
      }
      // Restore polygon Points.
      var top = self.historyStack.peek();
      self.polygonPoints = $.extend(true, [], top.poly);

      var img = new Image();
      var canvas = self.canvas[0];

      $(img).load(function(){
        canvas.width = img.width;
        canvas.height = img.height;
        self.overlay.css('width', img.width);
        self.overlay.css('height', img.height);
        self.ctx.drawImage(img, 0, 0);

        self.width = self.ctx.canvas.width;
        self.height = self.ctx.canvas.height;
        console.log(self.width, self.height);
        self.clicksCanvas = 0;
        self.clicksLabel = 0;
        self.scaleCanvas = 1;
        self.scaleLabel = 1;
        var withDrawing = self.ctx.getImageData(0, 0, self.width, self.height);
        self.imageData = state.imageData;
        self.nonscaledCanvas = $("<canvas>").attr("width", self.width).attr("height", self.height)[0];
        self.nonscaledCtx = self.nonscaledCanvas.getContext("2d");
        self.nonscaledCtx.putImageData(withDrawing, 0, 0);
        self.bbox = {
            bboxData: null,
            isBox: false,
            start_x: 0,
            start_y: 0,
            end_x: self.width,
            end_y: self.height,
        };
        self.canvasData = this.src;
        self.renderDict(top.label);
        $('#label-img').attr('src', self.nonscaledCanvas.toDataURL());
        $('#label-img').css({
          'width': self.width,
          'height': self.height,
        });
      });
      img.src = state.canvasData;

    },

    addHiesFromState: function(hierarchy, state){
      var self = this;
      // var root = self.$selectHieFrame.tree('getTree');
      var container = self.$selectHieFrame;
      var hierarchies = self.$hieOptions;
      var selectHieID = -1;
      var selectClassID = -1;

      self.hierarchyStack = $.extend(true, new infoStack(self.stackType['class'], 50), hierarchy);
      for (var i = 0; i < hierarchy.getSize(); i++){
        var item = hierarchy.find(i);
        //{'name': string, 'color': string, 'uid', int, 'node': classnode}
        var childNodes = item['classes'];


        container.tree('appendNode',{
          name: item['name'],
          id: item['id'],
        });

        var option = $('<option value=' + item['id'].toString() +'>'+ item['name'] +'</option>');
        hierarchies.append(option);

        var parentNode = container.tree('getNodeById', item['id']);


        for (var k = 0; k < childNodes.length; k++){
          var child = childNodes[k];


          container.tree('appendNode', {
            name: child['name'],
            color: child['color'],
            id: child['uid'],
          }, parentNode);

          var childNode = container.tree('getNodeById', child['uid']);


          // if (state.selectedHie && state.selectedHie['id'] == item['id'] && state.selectedItem && state.selectedItem['name'] === child['name']){
          //   selectClassID = child['uid'];
          //   self.selectedItem = state.selectedItem;
          // }

          container.tree('openNode', parentNode);


          var root = container.tree('getTree');
          var nodes = root['children'];
          for (var kk = 0; kk < nodes.length; kk++){
            var node = nodes[kk];
            for (var ii = 0; ii < node.children.length; ii++){
              var divId = node.children[ii].id;
              var divColor = node.children[ii].color;

              var colorBlock = $('#hie' + divId + '');

              colorBlock.css({
                'display': 'inline-block',
                'width': '20px',
                'height': '20px',
                'float': 'right',
                'margin-right': '20px',
                'background-color': '#' + divColor,
              });
            }
          }

        }
        // if (state.selectedHie && state.selectedHie['id'] == item['id']){
        //   selectHieID = item['id'];
        //   self.selectedHie = state.selectedHie;
        // }else if (state.selectedHie && state.selectedHie['id'] != item['id']){
        //   var disChildren = parentNode.children;
        //   for (var j = 0; j < disChildren.length; j++){
        //     var disChild = disChildren[j];
        //     $(disChild.element).children('div').children('span').addClass('disable-hie');
        //   }
        // }
        self.selectedHie = null;
        self.selectedItem = null;
      }

      var root = container.tree('getTree');
      var nodes = root['children'];
      //console.log(selectHieID, selectClassID);
      for (var i = 0; i < nodes.length; i++){
        var node = nodes[i];
        if (node.id == selectHieID){
          if (!$(node.element).children('div').hasClass('highlight-hie')){
            $(node.element).children('div').addClass('highlight-hie');
          }
          for (var j = 0; j < node.children.length; j++){
            if (node.children[j].id == selectClassID){
              if (!$(node.children[j].element).children('div').hasClass('highlight-class')){
                $(node.children[j].element).children('div').addClass('highlight-class');
              }
            }
          }
        }
      }


    },
    storeState: function(figure){
      var self = this;
      var cid = self.curImgID;

      var sid = figure.find('img').attr('id');
      var nid = parseInt(sid.substring(sid.indexOf('-')+1, sid.length));

      if (cid == nid){
        return false;
      }

      var states = self.states;
      // Deep copy
      var history = $.extend(true, {}, self.historyStack);
      var hierarchy = $.extend(true, {}, self.hierarchyStack);

      // Copy image data
      var dst = self.ctx.createImageData(self.imageData.width, self.imageData.height);
      dst.data.set(self.imageData.data);
      var copiedImageData = dst;


      var state = new State(history, hierarchy, self.nonscaledCanvas.toDataURL(), copiedImageData);
      states[cid] = state;
      return true;

    },
    restoreState: function(figure){
      var self = this;
      var sid = figure.find('img').attr('id');
      var imgURL = figure.find('img').attr('src');
      var nid = parseInt(sid.substring(sid.indexOf('-')+1, sid.length));
      var states = self.states;
      var state = states[nid];
      //
      // console.log(nid);


      if (state){
        self.initializeOptionPanel();
        var history = state.history;
        var hierarchy = state.hierarchy;

        self.removeAllHies();
        self.addHiesFromState(hierarchy, state);
        self.removeAllHis();
        self.addHisFromState(history, imgURL, state);

      }else{
        /* Initialize all state */
        // Initialize history state
        self.removeAllHis();
        self.historyStack = new infoStack(self.stackType['history'], 20);
        $('#label-img').attr('src', '');


        var img = new Image();
        var canvas = self.canvas[0];

        $(img).load(function(){
          canvas.width = img.width;
          canvas.height = img.height;
          self.overlay.css('width', img.width);
          self.overlay.css('height', img.height);
          self.ctx.drawImage(img, 0, 0);

          self.width = self.ctx.canvas.width;
          self.height = self.ctx.canvas.height;
          self.clicksCanvas = 0;
          self.clicksLabel = 0;
          self.scaleCanvas = 1;
          self.scaleLabel = 1;
          self.imageData = self.ctx.getImageData(0, 0, self.width, self.height);
          self.nonscaledCanvas = $("<canvas>").attr("width", self.width).attr("height", self.height)[0];
          self.nonscaledCtx = self.nonscaledCanvas.getContext("2d");
          self.nonscaledCtx.putImageData(self.imageData, 0, 0);
          self.bbox = {
              bboxData: null,
              isBox: false,
              start_x: 0,
              start_y: 0,
              end_x: self.width,
              end_y: self.height,
          };
          console.log(self.width, self.height)
          self.polygonPoints = new Array();
          self.historyStack.add({
                                image   : self.imageData,
                                tool    : null,
                                label   : new Label(),
                                scale   : 1,
                                bbox    : $.extend(true, {}, self.bbox),
                                // Add hierarchy info into stack. (deep copy)
                                hie     : null,
                                poly    : self.polygonPoints,
                              });
          self.canvasData = this.src;
        });
        img.src = imgURL;

      }
      self.curImgID = nid;

    },
    loadingGallery: function(){
      var self = this;
      var files = self.images;
      var gallery = self.$galleryMain;

      for (var i = 0; i < files.length; i++){
        var rawName = files[i].name;
        var block = $('<figure class="image-item"></figure>');
        var thumb = $('<img id="image-' + i.toString() + '" class="image-block" src="static/img/loading.gif"></img>');
        var name = $('<figcaption class="image-name">' + rawName.substr(0, rawName.lastIndexOf('.')) + '</figcaption>');

        block.append(thumb);
        block.append(name);
        gallery.append(block);

        // immediately-invoked function expression (help asynchronization getting index of filereader)
        (function(file, idx){
          var reader = new FileReader();

          $(reader).load(function(e){
            $('#image-' + idx.toString()).attr('src', e.target.result);
          })
          reader.readAsDataURL(file);
        })(files[i], i);

      }

    },
    handleMousemove: function(e, canvas, historyFrame){
      e.preventDefault();
      var self = this;
      if (!self.curTool || !self.selectedItem || !self.selectedHie){
        return;
      }
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      var scaled_x_off = (e.pageX - $(canvas).offset().left) / self.scaleCanvas;
      var scaled_y_off = (e.pageY - $(canvas).offset().top) / self.scaleCanvas;


      switch(self.curTool){
        case 'Pen':
          if (self.mousePressed){
            if (self.bbox.isBox && !self.withinBbox(scaled_x_off, scaled_y_off)){
              alert('out from bounding box...');
              self.mousePressed = false;
              $('#overlay').css('display', 'block');
              var info = self.constructRequest();
              var imgInfo = {
                img   : self.nonscaledCtx.getImageData(0, 0, self.width, self.height),
                scale : self.scaleCanvas,
                bbox  : self.bbox,
                poly  : self.polygonPoints,
                clicks: self.clicksCanvas,
              };
              var json = JSON.stringify(info);
              self.sendMask(json, imgInfo, historyFrame);
            }else{
              self.drawLine(x_off, y_off);
            }

          }
          break;
        case 'Polygon':
          break;
        case 'Rectangle':
          break;
      }

    },
    handleMouseup: function(e, canvas, historyFrame){
      e.preventDefault();
      var self = this;
      console.log(self.curTool);
      // check if the tool and class is selected
      if (!self.curTool){
        return;
      }

      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      // var x_off = (e.pageX - $(canvas).offset().left) / self.scaleCanvas;
      // var y_off = (e.pageY - $(canvas).offset().top) / self.scaleCanvas;

      switch (self.curTool) {
        case 'Pen':
          if (!self.selectedItem || !self.selectedHie){
            return;
          }
          $('#overlay').css('display', 'block');
          var info = self.constructRequest();
          var imgInfo = {
            img   : self.nonscaledCtx.getImageData(0, 0, self.width, self.height),
            scale : self.scaleCanvas,
            bbox  : self.bbox,
            poly  : self.polygonPoints,
            clicks: self.clicksCanvas,
          };
          var json = JSON.stringify(info);
          self.sendMask(json, imgInfo, historyFrame);
          break;
        case 'Rectangle':
          if (self.mousePressed){
            self.drawRect(x_off, y_off);
          }
          break;
        case 'Polygon':
          break;
        default:
          console.log('Error!');
          return;
      }

      self.mousePressed = false;
      self.metaData = new Array();

    },
    withinBbox: function(x, y){
      var self = this;
      return x > self.bbox.start_x && x < self.bbox.end_x
        && y > self.bbox.start_y && y < self.bbox.end_y;
    },

    handleMousedown: function(e, canvas, historyFrame){
      var self = this;
      e.preventDefault();
      if (!self.curTool){
        return;
      }

      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      var scaled_x_off = (e.pageX - $(canvas).offset().left) / self.scaleCanvas;
      var scaled_y_off = (e.pageY - $(canvas).offset().top) / self.scaleCanvas;


      switch(self.curTool){
        case 'Pen':
          if (self.bbox.isBox && !self.withinBbox(scaled_x_off, scaled_y_off)){
            alert('Please drawing inside the bounding box...');
            return;
          }
          if (!self.selectedItem || !self.selectedHie){
            return;
          }
          self.drawLineBegin(x_off, y_off);
          break;
        case 'Polygon':
          if (!self.selectedItem || !self.selectedHie){
            return;
          }
          if (self.bbox.isBox && !self.withinBbox(scaled_x_off, scaled_y_off)){
            alert('Please drawing inside the bounding box...');
            return;
          }

          // if start a polygon draw
          if (self.polyStarted){
            var curPoly = self.polygonPoints[self.polygonPoints.length-1]['points'];
            // end polygon draw by clicking near the start point or reaching the max num of points
            if(Math.abs(scaled_x_off - curPoly[0].x) < self.POLY_END_CLICK_RADIUS && Math.abs(scaled_y_off - curPoly[0].y) < self.POLY_END_CLICK_RADIUS) {
              self.polyStarted = false;
              self.sendPoly = true;
            } else {
              var newPoint = new Point(Math.round(scaled_x_off), Math.round(scaled_y_off));

              curPoly[curPoly.length] = newPoint;
              self.metaData[self.metaData.length] = newPoint;
              if(curPoly.length >= self.POLY_MAX_POINTS) {
                self.polyStarted = false;
                self.sendPoly = true;
              }
            }

          }else{
            // start a polygon draw
            self.drawPolyBegin(scaled_x_off, scaled_y_off)
            self.sendPoly = false;
          }
          if (self.sendPoly){
            // Find the rectangle region of drawn polygon
            var curPoly = self.polygonPoints[self.polygonPoints.length-1]['points'];
            var maxX = Number.MIN_VALUE, maxY = Number.MIN_VALUE, minX = Number.MAX_VALUE, minY = Number.MAX_VALUE;
            for (var i = 0; i < curPoly.length; i++){
              var x = curPoly[i].x;
              var y = curPoly[i].y;
              maxX = x > maxX ? x : maxX;
              maxY = y > maxY ? y : maxY;
              minX = x < minX ? x : minX;
              minY = y < minY ? y : minY;
            }

            // For each point in the rectangle region, put into metaData if the point is inside the polygon.
            for (var r = minX; r <= maxX; r++){
              for(var c = minY; c <= maxY; c++){
                var curPoint = new Point(r, c);
                if (self.insidePoly(curPoint, curPoly)){
                  self.metaData[self.metaData.length] = curPoint;
                }
              }
            }

            // Send request
            self.drawPolygon(self.ctx);
            self.drawPolygon(self.nonscaledCtx);
            var info = self.constructRequest();
            $('#overlay').css('display', 'block');
            var imgInfo = {
              img   : self.nonscaledCtx.getImageData(0, 0, self.width, self.height),
              scale : self.scaleCanvas,
              bbox  : self.bbox,
              poly  : self.polygonPoints,
              clicks: self.clicksCanvas,
            };
            var json = JSON.stringify(info);
            self.sendMask(json, imgInfo, historyFrame);
          }else{
            self.drawPolygon(self.ctx);
            self.drawPolygon(self.nonscaledCtx);
          }
          break;
        case 'Rectangle':
          self.drawRectBegin(x_off, y_off);
          break;
      }

    },
    handleMouseleave: function(e, canvas, historyFrame){
      e.preventDefault();
      var self = this;
      if (!self.curTool){
        return;
      }
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      // var x_off = (e.pageX - $(canvas).offset().left) / self.scaleCanvas;
      // var y_off = (e.pageY - $(canvas).offset().top) / self.scaleCanvas;

      switch (self.curTool) {
        case 'Pen':
          if (!self.selectedItem || !self.selectedHie){
            return;
          }
          if (self.mousePressed){
            var info = self.constructRequest();
            $('#overlay').css('display', 'block');
            var imgInfo = {
              img   : self.nonscaledCtx.getImageData(0, 0, self.width, self.height),
              scale : self.scaleCanvas,
              bbox  : self.bbox,
              poly  : self.polygonPoints,
              clicks: self.clicksCanvas,
            };
            var json = JSON.stringify(info);
            self.sendMask(json, imgInfo, historyFrame);
          }
          break;
        case 'Polygon':
          break;
        case 'Rectangle':
          if (self.mousePressed){
            self.drawRect(x_off, y_off);
          }
          break;
        default:
          alert('Error!');
          return;
      }

      self.mousePressed = false;
    },
    constructRequest: function(){
      var self = this;
      var color = self.hexToRgb(self.selectedItem.color)
      var top = self.historyStack.peek();
      var obj = self.selectedHie ? self.selectedHie.name : null;
      var cls = self.selectedItem ? self.selectedItem.name : null;
      var info = {
                  'image': self.canvasData,
                  'mask': self.metaData,
                  'prev': top.label,
                  'color': color,
                  'mode': self.curMode,
                  'obj': obj,
                  'cls': cls,
                  'tool': self.curTool,
                  'bbox': self.bbox,
                 }
      return info;
    },

    contrastColor: function(hexcolor){
      var r = parseInt(hexcolor.substr(0,2),16);
      var g = parseInt(hexcolor.substr(2,2),16);
      var b = parseInt(hexcolor.substr(4,2),16);
      var yiq = ((r*299)+(g*587)+(b*114))/1000;

      var textcolor = (yiq >= 128) ? 'black' : 'white';
      return textcolor;
    },
    //TODO: bugs to be fixed
    addAnnoClass: function(item, superItem, container, errorContainer){
        var self = this;
        var stack = null;

        if (superItem){
          stack = superItem.subClasses;
        }else{
          stack = self.classStack;
        }


        if (self.checkValidItem(stack, item, errorContainer)){
          errorContainer.hide();

          var state = stack.add(item);
          var id = stack.curIdx-1;

          if (state === 2){

            // TODO: view
            if (superItem){
              var parent = container.tree('getNodeById', superItem.uid);

              container.tree('appendNode', {
                id: item.uid,
                name: item.name,
                color: item.color,
              }, parent);
              container.tree('openNode', parent);

            }else{
              container.tree('appendNode', {
                id: item.uid,
                name: item.name,
                color: item.color,
              });
            }
            // Recover the color of selected item.
            if (self.selectedItem){
              var node = container.tree('getNodeById', self.selectedItem.uid);
              $(node.element).children('div').addClass('highlight');
              $(node.element).children('div').css('background-color', '#' + node.color);
            }
          } else{
            errorContainer.text('Reached maximum number, please remove useless name');
            errorContainer.show();
          }
        }else{
          errorContainer.show();
        }

    },
    addHierarchy: function(item, container, errorContainer, hierarchies){
      var self = this;
      var root = container.tree('getTree');
      var nodes = root['children'];

      if (!item['name']){
        errorContainer.text('Please type a name');
        errorContainer.show();
        return;
      }

      for (var i = 0; i < nodes.length; i++){
        if (nodes[i].name === item['name']){
          errorContainer.text('Duplicate Hierarchy Name.');
          errorContainer.show();
          return;
        }
      }
      errorContainer.hide();
      var id = self.uniqueId++;


      container.tree('appendNode',{
        name: item['name'],
        id: id,
      });

      item['id'] = id;

      self.hierarchyStack.add(item);

      var option = $('<option value=' + id.toString() +'>'+ item['name'] +'</option>');
      hierarchies.append(option);

      for (var k = 0; k < nodes.length; k++){
        var node = nodes[k];
        for (var i = 0; i < node.children.length; i++){
          var divId = node.children[i].id;
          var divColor = node.children[i].color;

          var colorBlock = $('#hie' + divId + '');

          colorBlock.css({
            'display': 'inline-block',
            'width': '20px',
            'height': '20px',
            'float': 'right',
            'margin-right': '20px',
            'background-color': '#' + divColor,
          });
        }
      }
    },

    addSubNode: function(id, container){
      var self = this;
      var node = container.tree('getNodeById', parseInt(id));
      var root = container.tree('getTree');
      var nodes = root['children'];

      if (!self.selectedItem){
        alert('please select an item');
        return;
      }

      for (var i = 0; i < node.children.length; i++){
        if (node.children[i].name === self.selectedItem.name){
          alert('Duplicates!');
          return;
        }
      }

      var classname = self.selectedItem.name;
      var color = self.selectedItem.color;
      var root = container.tree('getTree');

      var uid = self.uniqueId++;
      var hie = null;
      for (var i = 0; i < self.hierarchyStack.getSize(); i++){
        if (self.hierarchyStack.find(i).id == id){
          hie = self.hierarchyStack.find(i);
        }
      }
      //var hieNode = hie['node'];

      container.tree('appendNode', {
        name: classname,
        color: color,
        id: uid,
      }, node);

      // Add class to hierarchy stack
      var classnode = container.tree('getNodeById', uid);
      var classes = hie['classes'];
      classes[classes.length] = {'name': classname, 'color': color, 'uid': uid};
      container.tree('openNode', node);


      for (var i = 0; i < node.children.length; i++){
        var divId = node.children[i].id;
        var divColor = node.children[i].color;

        var colorBlock = $('#hie' + divId + '');

        colorBlock.css({
          'display': 'inline-block',
          'width': '20px',
          'height': '20px',
          'float': 'right',
          'margin-right': '20px',
          'background-color': '#' + divColor,
        });

      }

    },
    checkValidItem: function(stack, item, errorContainer){
      if (item.name){
        // var check = stack.checkDup(item);
        for (var i = 0; i < stack.getSize(); i++){
          var datum = stack.find(i);
          if (datum.name == item.name || datum.color == item.color){
            errorContainer.text('Duplicate Color or Class Name.');
            return false;
          }
        }
        return true;
      }else{
        errorContainer.text('Please Type a Class Name');
        return false;
      }
    },

    deleteClass: function(cstack, node){
      var self = this;
      var stack = [new AnnoClass(-1, null, cstack, null, null)];

      var cur, each, state;
      var children, len;
      while(cur = stack.pop()){

        children = cur.subClasses;
        for (var i = 0; i < children.getSize(); i++){
          var uid = children.find(i).uid;
          if (uid == node.id){
            state = children.delete(i);
            break;
          }
          each = self.$selectClassFrame.tree('getNodeById', uid);
          stack.push(children.find(i));
        }
      }
      if (state){

        self.$selectClassFrame.tree('removeNode', node);
        console.log(self.classStack);
      }else{
        alert("something wrong!");
        return;
      }
    },

    drawLineBegin: function(x, y){
      var self = this;
      self.metaData = new Array();
      self.mousePressed = true;
      self.point.x = Math.round(x / self.scaleCanvas);
      self.point.y = Math.round(y / self.scaleCanvas);
      self.metaData.push(new Point(Math.round(x / self.scaleCanvas), Math.round(y / self.scaleCanvas)));
    },
    fitLineXFixed: function(start_x, start_y, end_x, end_y, ctx, store, correction){
      var self = this;
      // line equation: y-y1 = (y2-y1)/(x2-x1) * (x-x1) derived: (y1-y2) * x + (x2-x1) * y + (x1-x2)*y1 + (y2-y1)*x1 = 0
      var a = start_y - end_y;
      var b = end_x - start_x;
      var c = (start_x - end_x) * start_y + (end_y - start_y) * start_x;

      var length = self.metaData.length;
      // fit the line on X-axis
      for (var fix_x = Math.round(Math.min(start_x, end_x)) + 1; fix_x < Math.round(Math.max(start_x, end_x)); fix_x++){
        var cal_y = Math.round((- (c + a * fix_x) / b));
        var pointOnLine = new Point(fix_x, cal_y);
        ctx.fillRect(pointOnLine.x-correction, pointOnLine.y-correction, self.lineWidth, self.lineWidth);


        if (store && (pointOnLine.x != self.metaData[length-1].x || pointOnLine.y != self.metaData[length-1].y)){
          for (var xi = pointOnLine.x-correction; xi < pointOnLine.x-correction + self.lineWidth; xi++){
            for (var yi = pointOnLine.y-correction; yi < pointOnLine.y-correction + self.lineWidth; yi++){
              self.metaData.push(new Point(xi, yi));
            }
          }
        }

      }
    },
    fitLineYFixed: function(start_x, start_y, end_x, end_y, ctx, store, correction){
      var self = this;
      // line equation: y-y1 = (y2-y1)/(x2-x1) * (x-x1) derived: (y1-y2) * x + (x2-x1) * y + (x1-x2)*y1 + (y2-y1)*x1 = 0
      var a = start_y - end_y;
      var b = end_x - start_x;
      var c = (start_x - end_x) * start_y + (end_y - start_y) * start_x;

      var length = self.metaData.length;

      for (var fix_y = Math.round(Math.min(start_y, end_y)) + 1; fix_y < Math.round(Math.max(start_y, end_y)); fix_y++){
        var cal_x = Math.round((- (c + b * fix_y) / a));
        var pointOnLine = new Point(cal_x, fix_y);

        ctx.fillRect(pointOnLine.x-correction, pointOnLine.y-correction, self.lineWidth, self.lineWidth);

        if (store && (pointOnLine.x != self.metaData[length-1].x || pointOnLine.y != self.metaData[length-1].y)){
          for (var xi = pointOnLine.x-correction; xi < pointOnLine.x-correction + self.lineWidth; xi++){
            for (var yi = pointOnLine.y-correction; yi < pointOnLine.y-correction + self.lineWidth; yi++){
              self.metaData.push(new Point(xi, yi));
            }
          }
        }

      }
    },


    drawLine: function(x, y){
      var self = this;
      var item = self.selectedItem;
      if (Math.round(self.point.x) == Math.round(x) && Math.round(self.point.y) == Math.round(y)){
        return;
      }

      if(self.selectedItem){
        self.ctx.beginPath();
        self.ctx.strokeStyle = '#' + self.selectedItem.color.toString();
        self.ctx.strokeStyle = '#' + self.selectedItem.color.toString();
        var rgb = self.hexToRgb(self.ctx.strokeStyle);
        var round_x = Math.round(x);
        var round_y = Math.round(y);
        var scaled_end_x = Math.round(x / self.scaleCanvas);
        var scaled_end_y = Math.round(y / self.scaleCanvas);
        var scaled_start_x = Math.round(self.point.x);
        var scaled_start_y = Math.round(self.point.y);

        //console.log(scaled_x, scaled_y, x, y, self.scaleCanvas);
        var r = rgb.r;
        var g = rgb.g;
        var b = rgb.b;
        var correction = Math.floor(self.lineWidth / 2);
        self.ctx.fillStyle = "rgba("+r+","+g+","+b+","+(255/255)+")";
        self.nonscaledCtx.fillStyle = "rgba("+r+","+g+","+b+","+(255/255)+")";
        self.ctx.fillRect(scaled_end_x-correction, scaled_end_y-correction, self.lineWidth, self.lineWidth );
        self.nonscaledCtx.fillRect(scaled_end_x-correction, scaled_end_y-correction, self.lineWidth, self.lineWidth);

        self.fitLineXFixed(scaled_start_x, scaled_start_y, scaled_end_x, scaled_end_y, self.nonscaledCtx, true, correction);
        self.fitLineXFixed(scaled_start_x, scaled_start_y, scaled_end_x, scaled_end_y, self.ctx, false, correction);

        self.fitLineYFixed(scaled_start_x, scaled_start_y, scaled_end_x, scaled_end_y, self.nonscaledCtx, true, correction);
        self.fitLineYFixed(scaled_start_x, scaled_start_y, scaled_end_x, scaled_end_y, self.ctx, true, correction);


        var length = self.metaData.length;

        self.point.x = scaled_end_x;
        self.point.y = scaled_end_y;
        if (scaled_end_x != self.metaData[length-1].x || scaled_end_y != self.metaData[length-1].y){
          // console.log(round_x-correction,round_x-correction + self.lineWidth)
          for (var start_x = scaled_end_x-correction; start_x < scaled_end_x-correction + self.lineWidth; start_x++){
            for (var start_y = scaled_end_y-correction; start_y < scaled_end_y-correction + self.lineWidth; start_y++){
              self.metaData.push(new Point(start_x, start_y));
            }
          }
          self.metaData.push(new Point(scaled_end_x, scaled_end_y));
        }
      }
    },

    // TODO: pixels inside polygon and put them into metaData
    drawPolyBegin: function(x, y){
      var self = this;
      var points = new Array();
      self.metaData = new Array();
      points[0] = new Point(Math.round(x), Math.round(y));
      self.metaData[0] = points[0]
      var item = {'points': points, 'color': self.selectedItem.color};
      self.polygonPoints[self.polygonPoints.length] = item;
      self.polyStarted = true;
    },

    drawPolygon: function(ctx){
      var self = this;
      if (!self.selectedItem){
        return;
      }
      ctx.fillStyle = "#000000";
      for (var k = 0; k < self.polygonPoints.length; k++){
        ctx.beginPath();
        var item = self.polygonPoints[k];
        var points = item['points'];
        var color = item['color'];
        ctx.strokeStyle = '#' + color.toString();
        ctx.lineWidth = self.lineWidth;


        if(points != null && points.length > 0) {
          ctx.moveTo(points[0].x, points[0].y);
          ctx.fillRect(points[0].x, points[0].y, 4, 4);

          for(var i = 1 ; i < points.length ; i++) {
            ctx.fillRect(points[i].x, points[i].y, 4, 4);
            ctx.lineTo(points[i].x, points[i].y);
          }

          if(!self.polyStarted) {
            ctx.lineTo(points[0].x, points[0].y);
          }
        }
        ctx.stroke();
      }

    },
    drawRectBegin: function(x, y){
      var self = this;
      self.mousePressed = true;

      // clear the previous bounding box if there is any
      if (self.bbox.isBox){

        var start_x = self.bbox.start_x * self.scaleCanvas;
        var start_y = self.bbox.start_y * self.scaleCanvas;
        var end_x = self.bbox.end_x * self.scaleCanvas;
        var end_y = self.bbox.end_y * self.scaleCanvas;
        var h = end_y - start_y;
        var w = end_x - start_x;

        var divergence = Math.round(1 / self.scaleCanvas);
        var drawnArea = self.ctx.getImageData(start_x+divergence,
        start_y+divergence, w-divergence-2, h-divergence-2);
        console.log(self.bbox,divergence);

        self.ctx.putImageData(self.bbox.bboxData, start_x-divergence, start_y-divergence);
        self.ctx.putImageData(drawnArea, start_x+divergence, start_y+divergence)
      }

      self.bbox.start_x = Math.round(x / self.scaleCanvas);
      self.bbox.start_y = Math.round(y / self.scaleCanvas);
      self.bbox.isBox = true;

    },
    drawRect: function(x, y){
      var self = this;

      self.bbox.end_x = Math.round(x / self.scaleCanvas);
      self.bbox.end_y = Math.round(y / self.scaleCanvas);

      if (self.bbox.start_x === self.bbox.end_x && self.bbox.start_y === self.bbox.end_y){
        self.bbox.start_x = 0;
        self.bbox.end_x = self.width;
        self.bbox.start_y = 0;
        self.bbox.end_y = self.height;
        self.bbox.bboxData = null;
        self.bbox.isBox = false;
        return;
      }

      // Store area image data;
      var start_x = self.bbox.start_x * self.scaleCanvas;
      var start_y = self.bbox.start_y * self.scaleCanvas;
      var end_x = self.bbox.end_x * self.scaleCanvas;
      var end_y = self.bbox.end_y * self.scaleCanvas;
      var divergence = Math.round(1 / self.scaleCanvas);


      var h = self.bbox.end_y - self.bbox.start_y;
      var w = self.bbox.end_x - self.bbox.start_x;
      self.bbox.bboxData = self.ctx.getImageData(start_x-divergence,
        start_y-divergence, w+divergence+1, h+divergence+1);

      var gradient=self.ctx.createLinearGradient(self.bbox.start_x,
                    self.bbox.start_y, self.bbox.end_x,self.bbox.end_y);
      gradient.addColorStop("0","magenta");
      gradient.addColorStop("0.5","blue");
      gradient.addColorStop("1.0","red");

      self.ctx.lineWidth = divergence;
      self.ctx.strokeStyle = gradient;
      self.ctx.strokeRect(self.bbox.start_x, self.bbox.start_y , w, h);

    },


    addHistory: function(imgInfo, container, res){
      var self = this;
      var stack = self.historyStack;

      var item = {
                  image   : imgInfo.img,
                  tool    : res.tool,
                  label   : res.label,
                  scale   : imgInfo.scale,
                  clicks  : imgInfo.clicks,
                  bbox    : $.extend(true, {}, imgInfo.bbox),
                  poly    : $.extend(true, [], imgInfo.poly),
                 };

      var state = stack.add(item);
      var id = stack.curIdx-1;


      var hisCell = $('<tr class="hisCell" id=' + id.toString() + '><td>'
      + item.tool + '</td><td><img src="'
      + self.canvasData +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');


      if (state === 1){
        self.updateId(container);
      }
      container.prepend(hisCell);

    },

    undoOnce: function(history){
      var self = this;
      var stack = self.historyStack;

      if (stack.curIdx == 1){
        return;
      }

      var tr = history.find('tbody').find('tr').first();
      var id = tr.attr('id');
      stack.delete(parseInt(id));

      tr.remove();

      var prev = stack.peek();
      var masks = prev.label;
      var scale = prev.scale;
      var bbox = prev.bbox;


      self.polygonPoints = $.extend(true, [], prev.poly);
      console.log(self.polygonPoints);
      self.scale = scale;

      // self.updateObject(prev.hie);

      var newWidth = self.width * scale;
      var newHeight = self.height * scale;

      self.ctx.canvas.width = newWidth;
      self.ctx.canvas.height = newHeight;
      var margin = self.canvas.css('margin');

      self.overlay.css({
        'width': Math.floor(newWidth),
        'height': Math.floor(newHeight),
        'margin': margin,
      });

      /* restore to canvas */
      var copiedCanvas = $('<canvas>').attr({
        width: self.width,
        height: self.height,
      })[0];
      copiedCanvas.getContext("2d").putImageData(prev.image, 0, 0);
      self.ctx.scale(scale, scale);
      self.ctx.clearRect(0, 0, self.width, self.height);
      self.ctx.drawImage(copiedCanvas, 0, 0);
      self.nonscaledCtx.clearRect(0, 0, self.width, self.height);
      self.nonscaledCtx.drawImage(copiedCanvas, 0, 0);
      // $('#label-img').attr('src', prev.overlap);

      //self.renderURL(prev.image, prev.overlap);
      self.renderDict(masks);
      $('#label-img').attr('src', self.nonscaledCanvas.toDataURL());
      if (stack.curIdx == 1){
        $('#label-img').attr('src', '');
      }
      // Restore the bounding box if any
      if (bbox.isBox){
        var divergence = Math.round(1 / scale);

        var h = bbox.end_y - bbox.start_y;
        var w = bbox.end_x - bbox.start_x;

        var gradient=self.ctx.createLinearGradient(self.bbox.start_x,
                      self.bbox.start_y, self.bbox.end_x,self.bbox.end_y);

        gradient.addColorStop("0","magenta");
        gradient.addColorStop("0.5","blue");
        gradient.addColorStop("1.0","red");

        self.ctx.lineWidth = divergence;
        self.ctx.strokeStyle = gradient;
        self.ctx.strokeRect(self.bbox.start_x, self.bbox.start_y , w, h);
      }


    },

    redoOnce: function(history){
      var self = this;
      var stack = self.historyStack;

      if (stack.find(stack.size)){
        var item = stack.find(stack.size);
        stack.add(item);

        var scale = item.scale;
        var bbox = item.bbox;
        var masks = item.label

        self.polygonPoints = $.extend(true, [], item.poly);

        // self.updateObject(item.hie);

        var newWidth = self.width * scale;
        var newHeight = self.height * scale;
        self.ctx.canvas.width = newWidth;
        self.ctx.canvas.height = newHeight;
        var margin = self.canvas.css('margin');

        self.overlay.css({
          'width': Math.floor(newWidth),
          'height': Math.floor(newHeight),
          'margin': margin,
        });

        var copiedCanvas = $('<canvas>').attr({
          width: self.width,
          height: self.height,
        })[0];


        copiedCanvas.getContext("2d").putImageData(item.image, 0, 0);
        self.ctx.scale(scale, scale);
        self.ctx.clearRect(0, 0, self.width, self.height);
        self.ctx.drawImage(copiedCanvas, 0, 0);
        self.nonscaledCtx.clearRect(0, 0, self.width, self.height);
        self.nonscaledCtx.drawImage(copiedCanvas, 0, 0);
        //$('#label-img').attr('src', item.overlap);


        self.renderDict(masks);
        $('#label-img').attr('src', self.nonscaledCanvas.toDataURL());
        //self.renderURL(item.image, item.overlap);

        // Restore the bounding box if any
        if (bbox.isBox){
          var divergence = Math.round(1 / scale);

          var h = bbox.end_y - bbox.start_y;
          var w = bbox.end_x - bbox.start_x;

          var gradient=self.ctx.createLinearGradient(self.bbox.start_x,
                        self.bbox.start_y, self.bbox.end_x,self.bbox.end_y);

          gradient.addColorStop("0","magenta");
          gradient.addColorStop("0.5","blue");
          gradient.addColorStop("1.0","red");

          self.ctx.lineWidth = divergence;
          self.ctx.strokeStyle = gradient;
          self.ctx.strokeRect(self.bbox.start_x, self.bbox.start_y , w, h);
        }

        var hisCell = $('<tr class="hisCell" id=' + stack.size + '><td>'
        + item.tool + '</td><td><img src="'
        + self.canvasData +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');
        history.prepend(hisCell);

      }
    },

    updateId: function(history){
      history.find('#1').remove();
      history.find('tr').each(function(index){
        var newId = parseInt($(this).attr('id')) - 1;
        $(this).attr('id', newId.toString());
      });
    },

    renderURL: function(url, label){
      var self = this;
      var img = new Image();
      var canvas = self.canvas[0];

      $(img).load(function(){
        canvas.width = img.width;
        canvas.height = img.height;
        self.overlay.css('width', img.width);
        self.overlay.css('height', img.height);
        self.ctx.drawImage(img, 0, 0);

      });
      img.src = url;

      // TODO: show previous label in the label wrapper
      var labImg = $('#label-img');
      if (!label){
        labImg.attr('src', '');
      }else{
        labImg.attr('src', label);
      }
    },
    hexToRgb: function(hex) {
      var result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
      return result ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      } : null;
    },
    sendXMLRequest: function(request, name){
      var self = this;
      $.ajax({
        url: '/xml_saver',
        data: request,
        type: 'POST',
        contentType: 'application/json',
        dataType: 'xml',
        success: function(response){
          var content = new XMLSerializer().serializeToString(response);
          var ending = '</annotator>';
          var content_without_ending = content.substring(0, content.indexOf(ending));

          var drawings = '<drawings>' + self.nonscaledCanvas.toDataURL() + '</drawings>';
          var image = '<canvasData>' + self.canvasData + '</canvasData>';
          var blob = new Blob([content_without_ending + drawings + image + ending], {type: "text/xml;charset=utf-8"});
          saveAs(blob, name + ".xml");
        },
        error: function(xhr, ajaxOptions, thrownError){
          console.log(thrownError);
        },
      });
      return false;
    },
    sendMask: function(json, imgInfo, historyFrame){
      var self = this;

      $.ajax({
        url: '/handle_action',
        data: json,
        type: 'POST',
        contentType: "application/json",
        success: function(response){
          self.addHistory(imgInfo, historyFrame, response);
          var top = self.historyStack.peek();
          var masks = top.label;
          console.log(masks);
          self.renderDict(masks);
          $('#label-img').attr('src', self.nonscaledCanvas.toDataURL());
          $('#overlay').css('display', 'none');

        },
        error: function(xhr){
          var text = JSON.parse(xhr.responseText);
          alert(text['message']);
          // Restore states
          var top = self.historyStack.peek();
          var masks = top.label;
          var poly = top['poly'];
          self.polygonPoints = $.extend(true, [], poly);

          overlay.css('display', 'none');
          self.renderDict(mask);
          $('#label-img').attr('src', self.nonscaledCanvas.toDataURL());
        }

      });

    },
    // For checking if a point is inside the polygon
    insidePoly: function(point, poly){
      var x = point.x, y = point.y;
      var inside = false;
      for (var i = 0, j = poly.length - 1; i < poly.length; j = i++){
        var xi = poly[i].x, yi = poly[i].y;
        var xj = poly[j].x, yj = poly[j].y;

        var intersect = ((yi > y) != (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
      }
      return inside;
    },
    renderMask: function(dict){
      var self = this;

      var canvas = self.canvas[0];
      var newImage = self.nonscaledCtx.createImageData(self.width, self.height);
      //var arr = self.nonscaledCtx.getImageData(0, 0, canvas.width, canvas.height);
      var pixels = self.imageData.data;

      var pos = dict.pos;
      var edge = dict.edge;

      for (var key in pos){
        var obj = pos[key];
        for (var clsname in obj){
          var cls = obj[clsname]
          var coords = cls['coords'];
          var color = cls['color'];

          for (var i = 0; i < coords.length; i++){
            var coord = coords[i];
            var index = (coord.x + coord.y * self.width) * 4;
            newImage.data[index] = color.r;
            newImage.data[index + 1] = color.g;
            newImage.data[index + 2] = color.b;
            newImage.data[index + 3] = 255;
          }
        }
      }

      var copiedCanvas = $('<canvas>').attr({
        width: self.width,
        height: self.height,
      })[0];
      copiedCanvas.getContext("2d").putImageData(newImage, 0, 0);
      var url = copiedCanvas.toDataURL();
      return url;
    },
    renderDict: function(dict){
      var self = this;

      var newImage = self.nonscaledCtx.createImageData(self.width, self.height);
      //var arr = self.ctx.getImageData(0, 0, canvas.width, canvas.height);
      var pixels = self.imageData.data;

      var pos = dict.pos;
      var edge = dict.edge;

      console.log(pos);

      for(var i = 0; i < pixels.length; i+=4){
        var r = pixels[i];
        var g = pixels[i + 1];
        var b = pixels[i + 2];
        var a = pixels[i + 3];
        newImage.data[i] = r;
        newImage.data[i + 1] = g;
        newImage.data[i + 2] = b;
        newImage.data[i + 3] = a;
      }


      for (var key in pos){
        var obj = pos[key];
        for (var clsname in obj){
          var cls = obj[clsname]
          var coords = cls['coords'];
          var color = cls['color'];
          console.log(color);
          for (var i = 0; i < coords.length; i++){
            var coord = coords[i];
            var index = (coord.x + coord.y * self.width) * 4;
            newImage.data[index] = color.r * 0.5 + pixels[index] * 0.5;
            newImage.data[index + 1] = color.g * 0.5 + pixels[index + 1] * 0.5;
            newImage.data[index + 2] = color.b * 0.5 + pixels[index + 2] * 0.5;
            newImage.data[index + 3] = 255;
          }
        }
      }

      for (var key in edge){
        var obj_edge = edge[key];
        for (var clsname_edge in obj_edge){
          var cls_edge = obj_edge[clsname_edge];
          for (var i = 0; i < cls_edge.length; i++){
            var coord_edge = cls_edge[i];
            var index_edge = (coord_edge.x + coord_edge.y * self.width) * 4;
            newImage.data[index_edge] = 255;
            newImage.data[index_edge + 1] = 255;
            newImage.data[index_edge + 2] = 255;
            newImage.data[index_edge + 3] = 255;
          }
        }
      }

      var copiedCanvas = $('<canvas>').attr({
        width: self.width,
        height: self.height,
      })[0];
      copiedCanvas.getContext("2d").putImageData(newImage, 0, 0);

      self.ctx.scale(self.scaleCanvas, self.scaleCanvas);
      self.ctx.clearRect(0, 0, self.width, self.height);
      self.ctx.drawImage(copiedCanvas, 0, 0);

      var url = copiedCanvas.toDataURL();
      return url;


    },
    decodeXML: function(xml){
      var self = this;

      var classContent = xml.find('classStack');
      var objectContent = xml.find('hierarchyStack');
      var labelContent = xml.find('label');
      var drawingsContent = xml.find('drawings').text();
      var canvasDataContent = xml.find('canvasData').text();

      $('#label-img').attr('src', drawingsContent);




      self.removeAllHies();
      self.removeAllHis();
      $('#deleteall').click();

      self.classStack = new infoStack(self.stackType['class'], 50);

      self.decodeClass(classContent, self.classStack, null);

      self.hierarchyStack = new infoStack(self.stackType['class'], 50);

      self.decodeHierarchy(objectContent);

      self.historyStack = new infoStack(self.stackType['history'], 20);

      self.decodeLabel(labelContent, canvasDataContent);





    },
    decodeLabel: function(label, canvasData){
      var self = this;

      var edges = label.children('edge');
      var pos = label.children('pos');
      var num = label.children('numobj').text();

      var item = new Label();
      item.numObj = parseInt(num);

      edges.children().each(function(){

        var classes = $(this).children();
        var name = $(this).prop("tagName");

        (item.edge)[name] = {};
        var itemEdge = (item.edge)[name];

        classes.each(function(){
          var arr = $(this).children();
          var clsname = $(this).prop("tagName");

          var coords = new Array();
          arr.each(function(){
            var x = parseInt($(this).children('x').text());
            var y = parseInt($(this).children('y').text());
            var coord = {'x': x, 'y': y};
            coords[coords.length] = coord;
          });

          itemEdge[clsname] = coords;
        });
      });

      pos.children().each(function(){

        var classes = $(this).children();
        var name = $(this).prop("tagName");

        (item.pos)[name] = {};
        var itemPos = (item.pos)[name];

        classes.each(function(){
          var color = $(this).children('color');
          var coords = $(this).children('coords');
          var clsname = $(this).prop("tagName");

          var colorRGB = {};
          color.children().each(function(){
            var valueName = $(this).prop("tagName");
            colorRGB[valueName] = parseInt($(this).text());
          });

          console.log(colorRGB);

          var arr = new Array();
          coords.children().each(function(){
            var x = parseInt($(this).children('x').text());
            var y = parseInt($(this).children('y').text());
            var coord = {'x': x, 'y': y};
            arr[arr.length] = coord;
          });
          itemPos[clsname] = {'color': colorRGB, 'coords': arr};
        });
      });


      var img = new Image();
      $(img).load(function(){
        self.canvas[0].width = img.width;
        self.canvas[0].height = img.height;
        self.overlay.css('width', img.width);
        self.overlay.css('height', img.height);
        self.ctx.drawImage(img, 0, 0);

        self.width = self.ctx.canvas.width;
        self.height = self.ctx.canvas.height;
        self.clicksCanvas = 0;
        self.clicksLabel = 0;
        self.scaleCanvas = 1;
        self.scaleLabel = 1;
        self.imageData = self.ctx.getImageData(0, 0, self.width, self.height);
        self.nonscaledCanvas = $("<canvas>").attr("width", self.width).attr("height", self.height)[0];
        self.nonscaledCtx = self.nonscaledCanvas.getContext("2d");
        self.nonscaledCtx.putImageData(self.imageData, 0, 0);

        self.bbox = {
            bboxData: null,
            isBox: false,
            start_x: 0,
            start_y: 0,
            end_x: self.width,
            end_y: self.height,
        };
        self.polygonPoints = new Array();
        self.historyStack.add({
                              image   : self.imageData,
                              tool    : null,
                              label   : item,
                              scale   : 1,
                              bbox    : $.extend(true, {}, self.bbox),
                              // Add hierarchy info into stack. (deep copy)
                              hie     : null,
                              poly    : self.polygonPoints,
                            });
        self.canvasData = this.src;

        self.renderDict(item);
      });
      img.src = canvasData;

      console.log(item);





    },
    decodeHierarchy: function(obj){
      var self = this;
      var container = self.$selectHieFrame;
      if (obj.text() === '[]'){
        return;
      }

      obj.children().each(function(i, e){
        if ($(this).children('classes').text() === '[]'){
          return;
        }

        var id = parseInt($(this).children('id').text());
        var name = $(this).children('name').text();
        var classes = $(this).children('classes');

        container.tree('appendNode', {
          name: name,
          id: id,
        });
        var objNode = container.tree('getNodeById', id);
        var clsArr = new Array();

        classes.children().each(function(){
          var clsName = $(this).children('name').text();
          var color = $(this).children('color').text();
          var uid = parseInt($(this).children('uid').text());

          clsArr[clsArr.length] = {'name': classname, 'color':color, 'uid': uid};


          container.tree('appendNode', {
            name: clsName,
            color: color,
            id: uid,
          }, objNode);
          container.tree('openNode', objNode);

        });

        var item = {'name': name, 'classes': clsArr, 'id': id};
        self.historyStack.add(item);

      });
      var root = container.tree('getTree');
      var nodes = root['children'];
      for (var k = 0; k < nodes.length; k++){
        var node = nodes[k];
        for (var i = 0; i < node.children.length; i++){
          var divId = node.children[i].id;
          var divColor = node.children[i].color;

          var colorBlock = $('#hie' + divId + '');

          colorBlock.css({
            'display': 'inline-block',
            'width': '20px',
            'height': '20px',
            'float': 'right',
            'margin-right': '20px',
            'background-color': '#' + divColor,
          });
        }
      }

    },
    decodeClass: function(classes, stack, superClass){
      var self = this;

      if (classes.text() === '[]'){
        return;
      }

      classes.children().each(function(i, e){
        var pickedColor = $(this).children('color').text();
        var enteredName = $(this).children('name').text();
        var uid         = parseInt($(this).children('uid').text());
        var sclasses = new infoStack(self.stackType['class'], 50);
        var item = new AnnoClass(uid, null, sclasses, pickedColor, enteredName);
        console.log(uid);
        stack.add(item);


        if (superClass){
          var parent = self.$selectClassFrame.tree('getNodeById', superClass.id);
          self.$selectClassFrame.tree('appendNode', {
            id: uid,
            name: enteredName,
            color: pickedColor,
          }, parent);
          self.$selectClassFrame.tree('openNode', parent);
        }else{
          self.$selectClassFrame.tree('appendNode', {
            id: uid,
            name: enteredName,
            color: pickedColor,
          });
        }
        var node = self.$selectClassFrame.tree('getNodeById', uid);

        self.decodeClass($(this).children('subClasses').children('data'), sclasses, node);

      });

    },

  }

  $.fn.annotator = function(wrapperCanvas, imgURL, wrapperCanvasCtx, images, overlay){
    var annotator = new Annotator(wrapperCanvas, imgURL, wrapperCanvasCtx, images, overlay);
  }

})(jQuery);
