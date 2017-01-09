(function($){
  'use strict';
  /**
     * Function to load the image
     * @param {DOM} ele      [Can be any droppable DOM elements]
  */
  function ImgLoader(ele){
    this.$ele = $(ele);
    this.picData = null;
    this.$dragMsg = null;
    this.$chooseMsg = null;
    this.$msgBlock = null;
    this.$fileSelect = null;
    this.$annoCanvas = null;
    this.ctx = null;
    this.init();
  }
/* methods prototype of Imgloader */
  ImgLoader.prototype = {
    init: function(){
      // Avoid conflit with this key word inside a binding event.
      var self = this;

      self.$msgBlock = $('<div id = "showMsg"></div>');
      self.$dragMsg = $('<span id = "dragMsg" class = "theMsg">Drag your image to this block</span>');
      self.$chooseMsg = $('<span id = "chooseMsg" class = "theMsg">Click here to upload your image</span>');
      self.$fileSelect = $('<input id = "choose_img" type = "file" name = "mypic" >');
      self.$annoCanvas = $('<canvas id = "annoCanvas"></canvas>');


      self.$chooseMsg.append(self.$fileSelect);
      self.$msgBlock.append(self.$dragMsg);
      self.$msgBlock.append(self.$chooseMsg);
      self.$ele.append(self.$msgBlock)

      self.$fileSelect.on('change', function(e){
        var file = this.files[0];
        self.reader(file);
      });


      self.$msgBlock.on({
        mouseenter: function(e){
          e.preventDefault();
          self.$chooseMsg.stop().animate({"top":"0"},500);
          self.$dragMsg.stop().animate({"top":"100px"},500);
        },
        mouseleave: function(e){
          e.preventDefault();
          self.$chooseMsg.stop().animate({"top":"-100px"},500);
          self.$dragMsg.stop().animate({"top":"0"},500);
        },
      });
      self.$ele.on({

          dragleave: function(e){
            e.preventDefault();
            self.animations('black');
          },
          drop: function(e){
            e.preventDefault();

            // Get data that is dropped.
            e.dataTransfer = e.originalEvent.dataTransfer;
            var data = e.dataTransfer.files || e.target.files;

            if (data.length == 0){
              return;
            }

            var theImg = data[0];

            self.picData = self.reader(theImg);
          },
          dragenter: function(e){
            e.preventDefault();
            self.animations('orange');
          },
          dragover: function(e){
            e.preventDefault();
            self.animations('orange');
          }
      });

    },
    reader: function(img){
      var self = this;

      // Check dropped file is image or not.
      var mimeType = img.type;
      if (mimeType.indexOf('image') == -1){
        alert("Type error: Please put image file into block!");
        self.animations('black');
        return;
      }

      // Get reader objectd
      var reader = new FileReader();

      // After reader got loaded, save data into picData properties.
      $(reader).load(function(e){
        self.picData = e.target.result;
        self.render();
        self.hideWrapper();
      });
      reader.readAsDataURL(img)


    },
    render: function(){
      var self = this;
      var maxWidth = 700, maxHeight = 700;
      // Remove existed canvas
      // self.$ele.prev().find('#annoCanvas').remove();


      var img = new Image();
      var w, h, nw, nh, ratio;
      img.src = self.picData;
      $(img).load(function(e){
        w = this.width;
        h = this.height;

        // adjust the appearace of image on canvas
        if(w > maxWidth || h > maxHeight){
          if(w > h){
            ratio = w / maxWidth;
            nw = maxWidth;
            nh = h / ratio;
          }else{
            ratio = h / maxHeight;
            nh = maxHeight;
            nw = w / ratio;
          }
        }else
        {

          nh = h;
          nw = w;
        }
        // TODO: Comment out
        // console.log(nh,nw);
        // nh = 700;
        // nw = 700;
        // insert canvas before the drag drop element;
        self.$annoCanvas.insertBefore(self.$ele);
        // get context
        self.ctx = self.$annoCanvas[0].getContext('2d');

        self.$annoCanvas.attr({
          width: nw,
          height: nh,
        }).css({
          'position': 'relative',
          'top': '10%',
          'margin': '0 auto',
          // "box-shadow": "0px 0px 5px 7px #AFAFAF",
        });

        self.ctx.drawImage(img, 0, 0, nw, nh);

        var wrapperDiv = $('<div id = "wrapperDiv" class = "wrapperD"></div>');
        wrapperDiv.css({'background-color':'#000000',
            'width': '65%',
            'height': nh+120,
            'border-radius':20,
            'display' : 'inline-block',
            'position': 'relative',
            'margin': '0 auto',
            'overflow': 'auto',
          });
        self.$annoCanvas.wrap(wrapperDiv);

        self.$ele.annotator(self.$annoCanvas, self.picData, self.ctx);

      });


    },
    animations: function(color){
      this.$ele.css('background-color', color);
    },
    hideWrapper: function(){
      this.$ele.hide();
      this.$ele.prev().hide();
    },
    exposeWrapper: function(){
      this.$ele.show();
    },

  };

  $.fn.imgLoader = function(){
    var loader = new ImgLoader($(this));
  };


})(jQuery)
