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
      this.tempCtx = null;
      this.picData = imgURL;
      this.canvasData = null;
      this.stackType = null;
      this.ctx = wrapperCanvasCtx;
      this.classStack = null;
      this.historyStack = null;
      this.$classPanelWrapper = null;
      this.$hisPanelWrapper = null;
      this.$toolKitWrapper = null;
      this.$toolKit = null;
      this.$hisPanel = null;
      this.$classPanel = null;
      this.selectedItem = null;
      this.curTool = null;
      this.mousePressed = null;
      this.point = null;
      this.polygonPoints = null;
      this.polyStarted = null;
      this.lineWidth = null;
      this.polyNum = null;
      this.imgMask = null;
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
      self.polyNum = 0;
      self.lineWidth = 0;
      self.stackType ={'class': 0, 'history': 1};

      self.canvasData = self.canvas[0].toDataURL();
      self.classStack = new infoStack(self.stackType['class'], 50);
      self.historyStack = new infoStack(self.stackType['history'], 20);

      self.historyStack.add({'image': self.canvasData, 'tool': null});

      //radius of click around the first point to close the draw of polygon
      var END_CLICK_RADIUS = 10;
      //the max number of points of your polygon
      var MAX_POINTS = 8;


      self.$classPanelWrapper = $('<div class="panelwrapper"></div>');
      self.$hisPanelWrapper = $('<div class="panelwrapper"></div>');
      self.$toolKitWrapper = $('<div class="toolwrapper"></div>');

      var canvasX = self.canvas.offset().left;
      var canvasY = self.canvas.offset().top;
      var canvOffX = self.canvas.parent().offset().left - canvasX;
      var canvOffY = self.canvas.parent().offset().top - canvasY;
      console.log(self.canvas);
      var canvasW = self.canvas.attr('width');
      var canvasH = self.canvas.attr('height');
      self.thumbWidth = parseInt(self.canvas.attr('width'))/12;
      self.thumbHeight = parseInt(self.canvas.attr('height'))/12;

      // type of usage of stack.

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
      var deleteBtn = $('<button id="delete" class="decisionBtn">delete</button>');
      var deleteAllBtn = $('<button id="deleteall" class="decisionBtn">delete all</button>')

      selectFrame.append($('<thead><tr><th>Name</th><th>Color</th></tr></thead><tbody id="panelBody"></tbody>'))


      var defaultColor = hiddenInput.val();

      self.$classPanelWrapper.append(titleClass);
      self.$classPanelWrapper.append(nameTextBox);
      self.$classPanelWrapper.append(errorMsg);
      self.$classPanelWrapper.append(colorSelector);
      self.$classPanelWrapper.append(hiddenInput);
      self.$classPanelWrapper.append(addBtn);
      self.$classPanelWrapper.append(clearBtn);
      self.$classPanelWrapper.append(selectFrame);
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
      var lineWidth = [2, 3, 4, 5, 6, 7, 8, 9, 10];
      var titleTool = $('<p class="module-title">Toolkit</p>')
      var pencil = $('<span class="toolkit-item"><i class="fa fa-pencil" aria-hidden="true"></i>&nbsp pen</span>');
      var polygon = $('<span class="toolkit-item"><i class="fa fa-map-o" aria-hidden="true"></i>&nbsp polygon</span>')
      var rectangle = $('<span class="toolkit-item"><i class="fa fa-square-o" aria-hidden="true"></i>&nbsp rectangle</span>');
      var lineWidthText = $('<br/><span style="font-size:18px">line width</span>');
      var strokeOptions = $('<select id="selWidth" ></select>');



      for (var i = 0; i < lineWidth.length; i++){
        var option = $('<option value=' + lineWidth[i].toString() +'>'+ lineWidth[i].toString() +'</option>');
        strokeOptions.append(option);
      }

      self.lineWidth = strokeOptions.val();

      self.$toolKitWrapper.append(titleTool);
      self.$toolKitWrapper.append(pencil);
      self.$toolKitWrapper.append(polygon);
      self.$toolKitWrapper.append(rectangle);
      self.$toolKitWrapper.append(lineWidthText);
      self.$toolKitWrapper.append(strokeOptions);



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

        // colorSelector.css('background-color', '#' + defaultColor.toString());
        // hiddenInput.val(defaultColor);
        nameTextBox.val('');
      });

      clearBtn.on('click', function(e){
        e.preventDefault();
        errorMsg.hide();
        colorSelector.css('background-color', '#' + defaultColor.toString());
        hiddenInput.val(defaultColor);
        nameTextBox.val('');
      })

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
          console.log(self.classStack.curIdx);
        });
      });

      $(document).on('click',  '#selectFrame > tbody > tr', function(e){
        e.preventDefault();
        var selected = $(this).hasClass("highlight");
        $('#selectFrame > tbody > tr').removeClass("highlight");
        if(!selected)
            $(this).addClass("highlight");
        var idx = $(this).attr('id');
        var item = self.classStack.data[idx];
        self.selectedItem = item;

      });

      /* actions for toolkit and canvas*/

      $(document).on('click', '.toolkit-item', function(e){
        var selected = $(this).hasClass('highlight');
        $('.toolkit-item').removeClass('highlight');
        if(!selected)
            $(this).addClass('highlight');
        self.curTool = $(this).text().trim();
        console.log(self.curTool);
      });

      self.canvas.on({
        mousemove: function(e){
          self.handleMousemove(e, this)
        },
        mousedown: function(e){
          self.handleMousedown(e, this);
        },
        mouseup: function(e){
          self.handleMouseup(e, this, historyFrame);
        },
        mouseleave: function(e){
          self.handleMouseleave(e, this, historyFrame);
        }
      });

      strokeOptions.on('change', function(e){
        self.lineWidth = $(this).val();
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
        self.historyStack.add({'image': self.canvasData, 'tool': null});
        self.renderURL(self.canvasData);
      });



      var panelWidth = '17%';
      var mainWidth = main.width();


      self.$classPanelWrapper.css({
        'width': panelWidth,
        'height': '600px',
      });

      self.$hisPanelWrapper.css({
        'width': panelWidth,
        'height': '600px',
      });

      self.$toolKitWrapper.css({
        'position': 'relative',
        'display': 'block',
        'width': '50%',
        'bottom': '50px',
        'height': '200px',
        'margin': '0 auto',
      });
      self.$toolKitWrapper.insertBefore(canvWrapper);
      self.$classPanelWrapper.insertBefore(canvWrapper);
      self.$hisPanelWrapper.insertAfter(canvWrapper);

      panelWidth = self.$classPanelWrapper.width();
      // offset is calculated by the width of main div substract the width of canvas and two panels,
      // then divided by 2. This is distance between canvas and panels. 20 bias term for move inside a little bit.
      var offset = (mainWidth - canvWrapper.width() - 2 * panelWidth) / 2 - 20;

      self.$classPanelWrapper.css('right', offset);
      self.$hisPanelWrapper.css('left', offset);

      $(window).resize(function() {
        var mainWidth = main.width();
        var panelWidth = self.$classPanelWrapper.width();
        var offset = (mainWidth - canvWrapper.width() - 2 * panelWidth) / 2 - 20;
        self.$classPanelWrapper.css('right', offset);
        self.$hisPanelWrapper.css('left', offset);
      });


    },
    handleMousemove: function(e, canvas){
      e.preventDefault();
      var self = this;
      if (!self.curTool){
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
        case 'rectangle':
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
      // event coordinate
      var x_off = e.pageX - $(canvas).offset().left;
      var y_off = e.pageY - $(canvas).offset().top;

      if (self.curTool == 'rectangle'){
        self.drawRect(self.ctx, x_off, y_off);
      }
      self.mousePressed = false;
      var curImg = canvas.toDataURL();
      // Add history item
      self.addHistory(curImg, historyFrame);

    },

    handleMousedown: function(e, canvas){
      var self = this;
      e.preventDefault();
      if (!self.curTool){
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
              var curPoly = self.polygonPoints[self.polyNum-1]['points'];

              // end polygon draw by clicking near the start point or reaching the max num of points
              if(Math.abs(x_off - curPoly[0].x) < END_CLICK_RADIUS && Math.abs(y_off - curPoly[0].y) < END_CLICK_RADIUS) {
                self.polyStarted = false;
              } else {
                curPoly[curPoly.length] = new Point(x_off, y_off);
                if(curPoly.length >= MAX_POINTS) {
                  self.polyStarted = false;
                }
              }

            }else{
              // start a polygon draw
              self.drawPolyBegin(x_off, y_off)
            }
            self.drawPolygon();
          }else{
            alert('Please select a class name!');
            return;
          }
          break;
        case 'rectangle':
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

      if (self.mousePressed){
        if (self.curTool == 'rectangle'){
          self.drawRect(self.ctx, x_off, y_off);
        }
        var curImg = canvas.toDataURL();
        // Add history item
        self.addHistory(curImg, historyFrame);
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
      self.mousePressed = true;
      self.point.x = x;
      self.point.y = y;

    },
    drawLine: function(x, y){
      var self = this;
      var item = self.selectedItem;
      if(self.selectedItem){
        self.ctx.beginPath();
        self.ctx.strokeStyle = '#' + self.selectedItem['color'].toString();
        self.ctx.lineWidth = self.lineWidth;
        self.ctx.lineJoin = 'round';
        self.ctx.moveTo(self.point.x, self.point.y);
        self.ctx.lineTo(x, y);
        self.ctx.closePath();
        self.ctx.stroke();
        self.point.x = x;
        self.point.y = y;
      }else{
        alert("Please Choose a Class!");
        return;
      }
    },

    drawPolyBegin: function(x, y){
      var self = this;
      var points = new Array();
      points[0] = new Point(x, y)
      var item = {'points': points, 'color': self.selectedItem['color']};
      self.polygonPoints[self.polyNum++] = item;
      self.polyStarted = true;
    },

    drawPolygon: function(){
      var self = this;
      if (!self.selectedItem){
        return;
      }

      for (var k = 0; k < self.polyNum; k++){
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

    drawRectBegin: function(x, y){
      var self = this;
      self.mousePressed = true;
      self.point.x = x;
      self.point.y = y;
    },

    drawRect: function(ctx, x, y){
      var self = this;
      if (!self.selectedItem){
        return;
      }

      var h = y - self.point.y;
      var w = x - self.point.x
      var color = self.selectedItem['color'];
      ctx.beginPath();
      ctx.rect(self.point.x, self.point.y , w, h);
      ctx.fillStyle = 'transparent';
      ctx.fill();
      ctx.lineWidth = self.lineWidth;
      ctx.strokeStyle = '#' + color.toString();
      ctx.stroke();

    },

    drawRectToReal: function(x, y){
      var self = this;
      self.drawRect(self.ctx, x, y)
    },

    addHistory: function(img, container){
      var self = this;
      var stack = self.historyStack;
      var item = {'image': img, 'tool': self.curTool};


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

      self.renderURL(url);
    },

    redoOnce: function(history){
      var self = this;
      var stack = self.historyStack;

      if (stack.find(stack.size)){
              console.log(stack.size);
        var item = stack.find(stack.size);
        stack.add(item);
        var url = item['image'];
        self.renderURL(url);

        var hisCell = $('<tr class="hisCell" id=' + stack.size + '><td>'
        + item['tool'] + '</td><td><img src="'
        + item['image'] +'" style="width:' + self.thumbWidth + 'px;height:' + self.thumbHeight +'px;"></img></td></tr>');

        history.prepend(hisCell);

      }
    },

    updateId: function(history){
      history.find('tr').each(function(index){
        var newId = parseInt($(this).attr('id')) - 1;
        $(this).attr('id', newId.toString());
      });
    },

    renderURL: function(url){
      var self = this;
      var img = new Image();
      $(img).load(function(){
        self.ctx.drawImage(img, 0, 0);
      });
      img.src = url;
    },

    renderLastestURL: function(){
      var self = this;
      var item = self.historyStack.peek();
      var url = item['image'];
      self.renderURL(url);
    },

  }

  $.fn.annotator = function(wrapperCanvas, imgURL, wrapperCanvasCtx){
    var annotator = new Annotator(wrapperCanvas, imgURL, wrapperCanvasCtx);
  }



})(jQuery);
