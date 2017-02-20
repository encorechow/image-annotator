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


  /**
     * Function to construct annotator
     * @param {DOM} wrapperCanvas      [Canvas wrapping div]
     * @param {string} imgURL             [image URL for rendering to canvas]
     * @param {object} wrapperCanvasCtx   [Canvas Context]
  */

  function Annotator(wrapperCanvas, imgURL, wrapperCanvasCtx){
      this.canvas = wrapperCanvas;
      this.picData = imgURL;
      this.canvasData = null;
      this.stackType = null;
      this.ctx = wrapperCanvasCtx;
      // recording stacks
      this.classStack = null;
      this.historyStack = null;
      this.uniqueId = null;
      this.selectedHie = null;
      // {'name': string, 'id': id, 'classes': {'name': string, 'color': string, 'uid', int, 'node': classnode}, 'node': node, 'object': object label}
      this.hierarchyStack = null;
      // ready to send polygon mask or not
      this.sendPoly = null;
      // jQuery element for globally using
      this.$classPanelWrapper = null;
      this.$hisPanelWrapper = null;
      this.$toolKitWrapper = null;
      this.$hierarchyWrapper = null;
      this.$optionsWrapper = null;
      this.$toolKit = null;
      this.$hisPanel = null;
      this.$classPanel = null;
      this.$labelWrapper = null;
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
      self.sendPoly = false;
      self.uniqueId = 0;
      self.lineWidth = 0;
      // type of usage of stack.
      self.stackType ={'class': 0, 'history': 1};

      self.canvasData = self.canvas[0].toDataURL();
      self.classStack = new infoStack(self.stackType['class'], 50);
      self.historyStack = new infoStack(self.stackType['history'], 20);
      self.hierarchyStack = new infoStack(self.stackType['class'], 50);

      self.historyStack.add({'image': self.canvasData, 'tool': null, 'label': '', 'overlap': ''});

      //radius of click around the first point to close the draw of polygon
      self.POLY_END_CLICK_RADIUS = 10;
      //the max number of points of your polygon
      self.POLY_MAX_POINTS = 8;


      self.$optionsWrapper = $('<div class="optionswrapper panelwrapper "></div>');
      self.$classPanelWrapper = $('<div id="class-tab" class="optionsele panelwrapper"></div>');
      self.$hisPanelWrapper = $('<div class="panelwrapper"></div>');
      self.$toolKitWrapper = $('<div class="toolwrapper"></div>');
      self.$labelWrapper = $('<div class="labelwrapper"></div>');
      self.$hierarchyWrapper = $('<div id="hierarchy-tab" class="optionsele hierarchywrapper"></div>');

      var canvasX = self.canvas.offset().left;
      var canvasY = self.canvas.offset().top;
      var canvOffX = self.canvas.parent().offset().left - canvasX;
      var canvOffY = self.canvas.parent().offset().top - canvasY;

      var canvasW = self.canvas.attr('width');
      var canvasH = self.canvas.attr('height');
      self.thumbWidth = parseInt(self.canvas.attr('width'))/12;
      self.thumbHeight = parseInt(self.canvas.attr('height'))/12;



      // Get main div jquery wrapper
      var main = self.canvas.parent().parent().parent();

      // Get canvas wrapper div jquery wrapper
      var canvWrapper = self.canvas.parent();







      /* sub-elements for class panel */
      var titleClass = $('<p class="module-title">Class Panel</p>')
      var nameTextBox = $('<input id="classname" type="text" style="font-size: 20px" name="customclass" placeholder="enter a class name">');
      var addBtn = $('<button id="add" class="decisionBtn">add</button>');
      var errorMsg = $('<p id="errorMsg" class="error" style="display: none"></p>')
      var clearBtn = $('<button id="clear" class="decisionBtn">clear</button>');
      var colorSelector = $('#colorSelector');
      var hiddenInput = $('#color_value');
      var selectFrame = $('<table id="selectFrame" class="table table-hover panel-frame"></table>');
      var addToHieBtn = $('<button id="tohie" class="dicisionBtn">add to</button>');
      var hieOptions = $('<select id="hieopt" class="dicisionBtn"></select>');
      var deleteBtn = $('<button id="delete" class="decisionBtn">delete</button>');
      var deleteAllBtn = $('<button id="deleteall" class="decisionBtn">delete all</button>');
      var connectWrapper = $('<div></div>');

      connectWrapper.append(addToHieBtn);
      connectWrapper.append(hieOptions);

      selectFrame.append($('<thead><tr><th>Name</th><th>Color</th></tr></thead><tbody id="panelBody"></tbody>'));


      var defaultColor = hiddenInput.val();

      self.$classPanelWrapper.append(titleClass);
      self.$classPanelWrapper.append(nameTextBox);
      self.$classPanelWrapper.append(errorMsg);
      self.$classPanelWrapper.append(colorSelector);
      self.$classPanelWrapper.append(hiddenInput);
      self.$classPanelWrapper.append(addBtn);
      self.$classPanelWrapper.append(clearBtn);
      self.$classPanelWrapper.append(selectFrame);
      self.$classPanelWrapper.append(connectWrapper);
      self.$classPanelWrapper.append(deleteBtn);
      self.$classPanelWrapper.append(deleteAllBtn);

      /* sub-elements for history panel*/
      var titleHis = $('<p class="module-title">History Panel</p>')
      var undoBtn = $('<button id="undoHis" class="op-his">undo</button>');
      var redoBtn = $('<button id="redoHis" class="op-his">redo</button>');
      var clearBtn = $('<button id="clearHis" class="op-his">clear</button>');
      var historyFrame = $('<table id="historyFrame" class="table table-hover panel-frame"></table>');
      historyFrame.append($('<thead><tr><th>Action</th><th>Thumbnail</th></tr></thead><tbody id="panelBody"></tbody>'))

      self.$hisPanelWrapper.append(titleHis);
      self.$hisPanelWrapper.append(undoBtn);
      self.$hisPanelWrapper.append(redoBtn);
      self.$hisPanelWrapper.append(historyFrame);
      self.$hisPanelWrapper.append(clearBtn);


      /* sub-elements for tool kit*/
      var lineWidth = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      var algorithms = ['GrabCut', 'Manual'];
      var titleTool = $('<p class="module-title">Toolkit</p>')
      var pencil = $('<span class="toolkit-item"><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp pen</span>');
      var polygon = $('<span class="toolkit-item"><i class="fa fa-map-o" aria-hidden="true"></i>&nbsp polygon</span>')
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
      var hieNameTextBox = $('<input id="hiename" type="text" style="font-size: 20px" name="customhie" placeholder="enter a hierarchy name">');
      // TODO: change the variables name
      var addHieBtn = $('<button id="addHie" class="decisionBtn add-hie">add</button>');
      var errorHieMsg = $('<p id="errorMsg" class="error" style="display: none"></p>')
      var clearHieBtn = $('<button id="clear" class="decisionBtn">clear</button>');
      var selectHieFrame = $('<div id="selectHieFrame" class="hierarchy-div"></div>');
      var deleteHieBtn = $('<button id="deleteHie" class="decisionBtn">delete</button>');
      var deleteAllHieBtn = $('<button id="deleteAllHie" class="decisionBtn">delete all</button>')



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

      //TODO: click actions and delete actions
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
              self.selectedItem = {'name': node['name'], 'color': node['color']}
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
            $(sibling.node.element).children('div').removeClass('highlight-hie');
            if (sibling.id != node.id){
              var children = sibling.node.children;

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
            self.highlightObject();
          }else{
            self.selectedHie = null;
            self.selectedItem = null;
            for (var i = 0; i < stack.getSize(); i++){
              var cur = stack.find(i);
              for (var j = 0; j < cur.node.children.length; j++){
                $(cur.node.children[j].element).children('div').children('span').removeClass('disable-hie');
                $(cur.node.children[j].element).children('div').removeClass('highlight-class');
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

        // if selected is an class

        for (var i = 0; i < stack.getSize(); i++){
          var element = stack.find(i);
            // Find corresponding hierarchy
          if (element['id'] == hie['id']){
            if (self.selectedItem){
              var classes = element['classes'];
              for (var j = 0; j < classes.length; j++){
                if (self.selectedItem['color'] === classes[j]['color']){

                  // remove from tree
                  selectHieFrame.tree('removeNode', classes[j]['node']);

                  // re-render the color block
                  for (var i = 0; i < element['node'].children.length; i++){
                    var divId = element['node'].children[i].id;
                    var divColor = element['node'].children[i].color;

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
                  $(element['node'].element).children('div').addClass('highlight-hie');

                  // remove from stack
                  classes.splice(j, 1);
                  break;
                }
              }
            // if selected is a hierarchy tab, then remove this hierarchy and its classes
            }else{
              selectHieFrame.tree('removeNode', element['node']);
              self.selectedHie = null;
              hieOptions.find('option').filter(function(i, e){
                return $(e).val() == element['node'].id;
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
        var tree = selectHieFrame.tree('getTree');
        var children = tree['children'];

        // Remove all nodes in hierarchy
        while (children.length != 0){
          selectHieFrame.tree('removeNode', children[children.length-1]);
        }

        // Remove options in select tag
        hieOptions.find('option').remove();

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

      addBtn.on('click', function(e){
        e.preventDefault();
        var pickedColor = hiddenInput.val();
        var enteredName = nameTextBox.val();
        var item = {'name': enteredName, 'color': pickedColor};
        self.addAnnoClass(item, selectFrame, errorMsg);

        nameTextBox.val('');
      });

      clearBtn.on('click', function(e){
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
        var candidates = $('#selectFrame > tbody > tr');
        if(candidates.hasClass('highlight')){
          var highlighted = $('.highlight');
          self.deleteClass(self.classStack, highlighted);
          console.log(self.classStack.curIdx);
        }else{
          alert('Please select a class name to delete!');
          return;
        }
      });

      deleteAllBtn.on('click', function(e){
        var candidates = $('#selectFrame > tbody > tr');
        candidates.each(function(index){
          self.deleteClass(self.classStack, $(this));
        });
      });

      $(document).on('click',  '#selectFrame > tbody > tr', function(e){
        e.preventDefault();
        var selected = $(this).hasClass("highlight");
        $('#selectFrame > tbody > tr').removeClass("highlight");
        if(!selected){
          $(this).addClass("highlight");
          var idx = $(this).attr('id');
          var item = self.classStack.data[idx];
          self.selectedItem = item;
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
              self.drawPolygon();
              self.mousePressed = false;
              var curImg = self.canvas[0].toDataURL();
              // Add history item
              self.addHistory(curImg, historyFrame);
            }
        }
        self.curTool = $(this).text().trim();
        self.metaData = new Array();
      });

      self.canvas.on({
        mousemove: function(e){
          self.handleMousemove(e, this)
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
      clearBtn.on('click', function(e){
        historyFrame.find('tr').each(function(index){
          $(this).remove();
        });
        self.historyStack = new infoStack(self.stackType['history'], 20);
        self.historyStack.add({'image': self.canvasData, 'tool': null, 'label': '', 'overlap': ''});
        self.renderURL(self.canvasData, null);
        self.polygonPoints = new Array();
      });



      var panelWidth = '17%';
      var mainWidth = main.width();


      // Style of wrappers
      self.$optionsWrapper.css({
        'width': panelWidth,
        'height': '750px',
      })

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
        'height': '700px',
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
        'height': canvWrapper.height(),
        'overflow': 'auto',
        'width': '65%',
      });



      /* Tabs for options */
      var tabsWrapper = $('<div class="tabsWrapper"></div>');
      var classPanelOption = $('<li><a href="#class-tab">Class</a></li>');
      var hierarchyPanelOption = $('<li><a href="#hierarchy-tab">Hierarchy</a></li>');
      var tabsBar = $('<ul class="tabs"></ul>');
      var separator = $('<hr/>');

      tabsBar.append(classPanelOption);
      tabsBar.append(hierarchyPanelOption);
      tabsWrapper.append(tabsBar);



      self.$optionsWrapper.append(tabsWrapper);
      self.$optionsWrapper.append(separator);
      self.$optionsWrapper.append(self.$classPanelWrapper);
      self.$optionsWrapper.append(self.$hierarchyWrapper);


      self.$toolKitWrapper.insertBefore(canvWrapper);
      self.$optionsWrapper.insertBefore(canvWrapper);
      self.$labelWrapper.insertAfter(canvWrapper);
      $('<hr/>').insertAfter(canvWrapper);
      self.$hisPanelWrapper.insertAfter(canvWrapper);



      panelWidth = self.$optionsWrapper.width();
      // offset is calculated by the width of main div substract the width of canvas and two panels,
      // then divided by 2. This is distance between canvas and panels. 20 bias term for move inside a little bit.
      var offset = (mainWidth - canvWrapper.width() - 2 * panelWidth) / 2 - 20;

      self.$optionsWrapper.css('right', offset);
      self.$hisPanelWrapper.css('left', offset);

      $(window).resize(function() {
        var mainWidth = main.width();
        var panelWidth = self.$optionsWrapper.width();
        var offset = (mainWidth - canvWrapper.width() - 2 * panelWidth) / 2 - 20;
        self.$optionsWrapper.css('right', offset);
        self.$hisPanelWrapper.css('left', offset);
      });


      // Switch between tabs
      $('ul.tabs li:first').addClass('active');
      self.$hierarchyWrapper.hide();
      self.$classPanelWrapper.show();
      $('ul.tabs li').on('click',function(){
        $('ul.tabs li').removeClass('active');
        $(this).addClass('active')
        $('.optionsele').hide();
        var activeTab = $(this).find('a').attr('href');
        $(activeTab).show();

        // Initialize all state of the table.
        self.$hierarchyWrapper.find('.highlight-hie').removeClass('highlight-hie');
        self.$classPanelWrapper.find('.highlight').removeClass('highlight');
        self.$hierarchyWrapper.find('.disable-hie').removeClass('disable-hie');

        self.selectedItem = null;
        self.selectedHie = null;

        return false;
      });


    },
    handleMousemove: function(e, canvas){
      e.preventDefault();
      var self = this;
      if (!self.curTool || !self.selectedItem){
        return;
      }
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      switch(self.curTool){
        case 'pen':
          if (self.mousePressed){
            self.drawLine(x_off, y_off);
          }
          break;
        case 'polygon':
          break;
      }

    },
    handleMouseup: function(e, canvas, historyFrame){
      e.preventDefault();
      var self = this;
      // check if the tool and class is selected
      if (!self.curTool || !self.selectedItem){
        return;
      }

      var curImg = canvas.toDataURL();

      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;
      switch (self.curTool) {
        case 'pen':
          var color = self.hexToRgb(self.selectedItem['color'])
          var top = self.historyStack.peek();
          var obj = self.selectedHie ? {'object': self.selectedHie['object'], 'id': self.selectedHie['id']} : null;
          var info = {
                      'image': self.canvasData,
                      'mask': self.metaData,
                      'prev': top.label,
                      'color': color,
                      'mode': self.curMode,
                      'obj': obj,
                    }
          var json = JSON.stringify(info);
          self.sendMask(json, curImg, historyFrame);
          break;
        // case 'rectangle':
        //   self.drawRect(self.ctx, x_off, y_off);
        //   break;
        case 'polygon':
          break;
        default:
          alert('Error!');
          return;
      }

      self.mousePressed = false;
      self.metaData = new Array();

    },

    handleMousedown: function(e, canvas, historyFrame){
      var self = this;
      e.preventDefault();
      if (!self.curTool || !self.selectedItem){
        return;
      }
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      switch(self.curTool){
        case 'pen':
          self.drawLineBegin(x_off, y_off);
          break;
        case 'polygon':
          // if start a polygon draw
          if (self.selectedItem){
            if (self.polyStarted){
              var curPoly = self.polygonPoints[self.polygonPoints.length-1]['points'];
              // end polygon draw by clicking near the start point or reaching the max num of points
              if(Math.abs(x_off - curPoly[0].x) < self.POLY_END_CLICK_RADIUS && Math.abs(y_off - curPoly[0].y) < self.POLY_END_CLICK_RADIUS) {
                self.polyStarted = false;
                self.sendPoly = true;
              } else {
                var newPoint = new Point(Math.round(x_off), Math.round(y_off));

                curPoly[curPoly.length] = newPoint;
                self.metaData[self.metaData.length] = newPoint;
                if(curPoly.length >= self.POLY_MAX_POINTS) {
                  self.polyStarted = false;
                  self.sendPoly = true;
                }
              }

            }else{
              // start a polygon draw
              self.drawPolyBegin(x_off, y_off)
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
              var curImg = canvas.toDataURL();
              var color = self.hexToRgb(self.selectedItem['color'])
              var top = self.historyStack.peek();
              var obj = self.selectedHie ? {'object': self.selectedHie['object'], 'id': self.selectedHie['id']} : null;;
              var info = {
                          'image': self.canvasData,
                          'mask': self.metaData,
                          'prev': top.label,
                          'color': color,
                          'mode': self.curMode,
                          'obj': obj,
                        }
              var json = JSON.stringify(info);
              self.sendMask(json, curImg, historyFrame);

            }
            self.drawPolygon();
          }else{
            alert('Please select a class name!');
            return;
          }
          break;
        // case 'rectangle':
        //   self.drawRectBegin(x_off, y_off);
        //   break;
      }

    },
    handleMouseleave: function(e, canvas, historyFrame){
      e.preventDefault();
      var self = this;
      if (!self.curTool || !self.selectedItem){
        return;
      }
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      var curImg = canvas.toDataURL();

      switch (self.curTool) {
        case 'pen':
          if (self.mousePressed){
            var color = self.hexToRgb(self.selectedItem['color'])
            var top = self.historyStack.peek();
            var obj = self.selectedHie ? {'object': self.selectedHie['object'], 'id': self.selectedHie['id']} : null;
            var info = {
                        'image': self.canvasData,
                        'mask': self.metaData,
                        'prev': top.label,
                        'color': color,
                        'mode': self.curMode,
                        'obj': obj,
                      }
            var json = JSON.stringify(info);
            self.sendMask(json, curImg, historyFrame);
          }
          break;
        case 'polygon':
          break;
        default:
          alert('Error!');
          return;
      }

      self.mousePressed = false;
    },

    contrastColor: function(hexcolor){
      var r = parseInt(hexcolor.substr(0,2),16);
      var g = parseInt(hexcolor.substr(2,2),16);
      var b = parseInt(hexcolor.substr(4,2),16);
      var yiq = ((r*299)+(g*587)+(b*114))/1000;

      var textcolor = (yiq >= 128) ? 'black' : 'white';
      return textcolor;
    },

    addAnnoClass: function(item, container, errorContainer){
        var self = this;
        var stack = self.classStack;

        if (self.checkValidItem(stack, item, errorContainer)){
          errorContainer.hide();

          var state = stack.add(item);
          var id = stack.curIdx-1;

          if (state === 2){
            var classCell = $('<tr class="classCell" id=' + id.toString() + '><td>'
            + item['name'] + '</td><td><div style="width:20px;height:20px;background-color:#'
            + item['color'] +'"></div></td></tr>');

            container.append(classCell);
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
      item['node'] = container.tree('getNodeById', id);
      item['object'] = null;
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
      console.log(node, id);
      if (!self.selectedItem){
        alert('please select an item');
        return;
      }

      for (var i = 0; i < node.children.length; i++){
        if (node.children[i].name === self.selectedItem['name']){
          alert('Duplicates!');
          return;
        }
      }

      var classname = self.selectedItem['name'];
      var color = self.selectedItem['color'];
      var root = container.tree('getTree');

      var uid = self.uniqueId++;
      var hie = null;
      for (var i = 0; i < self.hierarchyStack.getSize(); i++){
        if (self.hierarchyStack.find(i).id == id){
          hie = self.hierarchyStack.find(i);
        }
      }
      var hieNode = hie['node'];

      container.tree('appendNode', {
        name: classname,
        color: color,
        id: uid,
      }, node);

      // Add class to hierarchy stack
      var classnode = container.tree('getNodeById', uid);
      var classes = hie['classes'];
      classes[classes.length] = {'name': classname, 'color': color, 'uid': uid, 'node': classnode};
      container.tree('openNode', node);

      // show gray if the hierarchy to be injected is not currently selected;
      // var selected = $(hieNode.element).children('div').hasClass('highlight-hie');
      // console.log(selected);
      // if (!selected){
      //   $(classnode.element).children('div').children('span').addClass('.disable-hie');
      // }

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
      if (item['name']){
        var check = stack.checkDup(item);
        if (check){
            errorContainer.text('Duplicate Color or Class Name.');
            return false;
        }
        return true;
      }else{
        errorContainer.text('Please Type a Class Name');
        return false;
      }
    },

    deleteClass: function(stack, itemTr){
      var self = this;
      var id = itemTr.attr('id');
      var state = stack.delete(parseInt(id));
      if (state){
        itemTr.nextAll().each(function(index){
          var sid = parseInt($(this).attr('id')) - 1;
          $(this).attr('id', sid.toString());
        });
        itemTr.remove();
      }else{
        alert("something wrong!");
        return;
      }
    },

    drawLineBegin: function(x, y){
      var self = this;
      self.metaData = new Array();
      self.mousePressed = true;
      self.point.x = Math.round(x);
      self.point.y = Math.round(y);
      self.metaData.push(new Point(Math.round(x), Math.round(y)));
    },
    drawLine: function(x, y){
      var self = this;
      var item = self.selectedItem;
      if (Math.round(self.point.x) == Math.round(x) && Math.round(self.point.y) == Math.round(y)){
        return;
      }

      if(self.selectedItem){
        self.ctx.beginPath();
        self.ctx.strokeStyle = '#' + self.selectedItem['color'].toString();
        var rgb = self.hexToRgb(self.ctx.strokeStyle);
        var round_x = Math.round(x);
        var round_y = Math.round(y);
        var r = rgb.r;
        var g = rgb.g;
        var b = rgb.b;
        var correction = Math.floor(self.lineWidth / 2);
        self.ctx.fillStyle = "rgba("+r+","+g+","+b+","+(255/255)+")";
        self.ctx.fillRect(round_x-correction, round_y-correction, self.lineWidth, self.lineWidth );

        // // line equation: y-y1 = (y2-y1)/(x2-x1) * (x-x1) derived: (y1-y2) * x + (x2-x1) * y + (x1-x2)*y1 + (y2-y1)*x1 = 0
        var a = self.point.y - y;
        var b = x - self.point.x;
        var c = (self.point.x - x) * self.point.y + (y - self.point.y) * self.point.x;

        var length = self.metaData.length;
        console.log(self.point.x, self.point.y, "--",round_x,round_y)
        // fit the line on X-axis
        for (var fix_x = Math.round(Math.min(self.point.x, x)) + 1; fix_x < Math.round(Math.max(self.point.x, x)); fix_x++){
          var cal_y = Math.round((- (c + a * fix_x) / b));
          var pointOnLine = new Point(fix_x, cal_y);

          if (pointOnLine.x != self.metaData[length-1].x || pointOnLine.y != self.metaData[length-1].y){
            for (var start_x = pointOnLine.x-correction; start_x < pointOnLine.x-correction + self.lineWidth; start_x++){
              for (var start_y = pointOnLine.y-correction; start_y < pointOnLine.y-correction + self.lineWidth; start_y++){
                self.metaData.push(new Point(start_x, start_y));

              }
            }
            self.ctx.fillRect( pointOnLine.x-correction, pointOnLine.y-correction, self.lineWidth, self.lineWidth );
          }
        }

        // fit the line on Y-axis
        for (var fix_y = Math.round(Math.min(self.point.y, y)) + 1; fix_y < Math.round(Math.max(self.point.y, y)); fix_y++){
          var cal_x = Math.round((- (c + b * fix_y) / a));
          var pointOnLine = new Point(cal_x, fix_y);
          if (pointOnLine.x != self.metaData[length-1].x || pointOnLine.y != self.metaData[length-1].y){

            for (var start_x = pointOnLine.x-correction; start_x < pointOnLine.x-correction + self.lineWidth; start_x++){
              for (var start_y = pointOnLine.y-correction; start_y < pointOnLine.y-correction + self.lineWidth; start_y++){
                self.metaData.push(new Point(start_x, start_y));
              }
            }
            self.ctx.fillRect( pointOnLine.x-correction, pointOnLine.y-correction, self.lineWidth, self.lineWidth );
          }
        }

        self.point.x = x;
        self.point.y = y;
        if (round_x != self.metaData[length-1].x || round_y != self.metaData[length-1].y){
          console.log(round_x-correction,round_x-correction + self.lineWidth)
          for (var start_x = round_x-correction; start_x < round_x-correction + self.lineWidth; start_x++){
            for (var start_y = round_y-correction; start_y < round_y-correction + self.lineWidth; start_y++){
              self.metaData.push(new Point(start_x, start_y));
            }
          }
          self.metaData.push(new Point(round_x, round_y));
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
      var item = {'points': points, 'color': self.selectedItem['color']};
      self.polygonPoints[self.polygonPoints.length] = item;
      self.polyStarted = true;
    },

    drawPolygon: function(){
      var self = this;
      if (!self.selectedItem){
        return;
      }
      self.ctx.fillStyle = "#000000";
      for (var k = 0; k < self.polygonPoints.length; k++){
        self.ctx.beginPath();
        var item = self.polygonPoints[k];
        var points = item['points'];
        var color = item['color'];
        self.ctx.strokeStyle = '#' + color.toString();
        self.ctx.lineWidth = self.lineWidth;


        if(points != null && points.length > 0) {
          self.ctx.moveTo(points[0].x, points[0].y);
          self.ctx.fillRect(points[0].x, points[0].y, 4, 4);

          for(var i = 1 ; i < points.length ; i++) {
            self.ctx.fillRect(points[i].x, points[i].y, 4, 4);
            self.ctx.lineTo(points[i].x, points[i].y);
          }

          if(!self.polyStarted) {
            self.ctx.lineTo(points[0].x, points[0].y);
          }
        }
        self.ctx.stroke();
      }

    },
    // drawRectBegin: function(x, y){
    //   var self = this;
    //   self.mousePressed = true;
    //   self.point.x = x;
    //   self.point.y = y;
    // },
    //
    // drawRect: function(ctx, x, y){
    //   var self = this;
    //   if (!self.selectedItem){
    //     return;
    //   }
    //
    //   var h = y - self.point.y;
    //   var w = x - self.point.x
    //   var color = self.selectedItem['color'];
    //   ctx.beginPath();
    //   ctx.rect(self.point.x, self.point.y , w, h);
    //   ctx.fillStyle = 'transparent';
    //   ctx.fill();
    //   ctx.lineWidth = self.lineWidth;
    //   ctx.strokeStyle = '#' + color.toString();
    //   ctx.stroke();
    //
    // },


    addHistory: function(img, container, res){
      var self = this;
      var stack = self.historyStack;

      var item = {'image': img, 'tool': self.curTool, 'label': 'data:image/png;base64,' + res.label, 'overlap': 'data:image/png;base64,' + res.overlap};


      var state = stack.add(item);
      var id = stack.curIdx-1;

      var hisCell = $('<tr class="hisCell" id=' + id.toString() + '><td>'
      + item['tool'] + '</td><td><img src="'
      + item['image'] +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');


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

      /* restore to canvas */
      var prev = stack.peek();

      var url = prev['image'];
      var label = prev['overlap'];

      self.renderURL(url, label);
    },

    redoOnce: function(history){
      var self = this;
      var stack = self.historyStack;

      if (stack.find(stack.size)){
              console.log(stack.size);
        var item = stack.find(stack.size);
        stack.add(item);
        var url = item['image'];
        var label = item['overlap'];
        self.renderURL(url, label);

        var hisCell = $('<tr class="hisCell" id=' + stack.size + '><td>'
        + item['tool'] + '</td><td><img src="'
        + item['image'] +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');

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
      $(img).load(function(){
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
    sendMask: function(json, curImg, historyFrame){
      var self = this;
      var overlay = $('#overlay');
      overlay.css('display', 'block');
      $.ajax({
        url: '/handle_action',
        data: json,
        type: 'POST',
        contentType: "application/json",
        success: function(response){
          var img = $('#label-img');
          var label = 'data:image/png;base64,' + response.objLabel;
          img.attr('src', 'data:image/png;base64,' + response.overlap);
          // Add history item
          self.addHistory(curImg, historyFrame, response);

          self.attachHieLabel(label);
          overlay.css('display', 'none');

        },
        error: function(xhr){
          var text = JSON.parse(xhr.responseText);
          alert(text['message']);
          overlay.css('display', 'none');
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
    // Highlight current object (hierarchy)
    highlightObject: function(){

    },
    attachHieLabel: function(label){
      var self = this;
      var stack = self.hierarchyStack;
      var hie = self.selectedHie;

      if (!hie){
        alert('unkown error!');
        return;
      }
      var id = hie['id'];

      for (var i = 0; i < stack.getSize(); i++){
        var match = stack.find(i);
        if (match['id'] == id){
          match['object'] = label;
          break;
        }
      }
    }

  }

  $.fn.annotator = function(wrapperCanvas, imgURL, wrapperCanvasCtx){
    var annotator = new Annotator(wrapperCanvas, imgURL, wrapperCanvasCtx);
  }

})(jQuery);
