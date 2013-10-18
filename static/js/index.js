// Insert widget into the tag of viewer-container *******(This is a customised version for home page.)*******
// Wei Liao
// 2013.10.18

$(document).ready(function() {
	// Defines
	var PI = Math.PI;
	var zerotol = 1e-5;
	var dataURL = $("div#viewer-container").attr("dataURL");

	// Canvas Parameters
	var canvas_width = 500;
	var canvas_height = 500;
	var mousedown_image = false;
	var old_x = 0.0;
	var old_y = 0.0;

	// Image Parameters
	var filename;
	var extension = "";
	var width;
	var height;
	var dimension;
	var terms;
	var basis_type;
	var element_size;
	var floatPixels = null;
	var imgData = null;
	var normalMap = null;

	// Compass Parameters
	var kr = 0.9;
	var radius = 100;
	var harf_compass = 120;
	var light = new Array(0.0, 0.0, 1.0);
	var mousedown_compass = false;

	// Tool Functions
	function getMin(a, b) {
		if (a < b) return a;
		else return b;
	}
	function getMax(a, b) {
		if (a > b) return a;
		else return b;
	}
	function limit(value, down, up) {
		return (getMax(down, getMin(up, value)));
	}
	function normalize(vector) {
		var s = 0;
		for (var i = 0; i < vector.length; ++i) {
			s += vector[i] * vector[i];
		}
		var ret = new Array(vector.length);
		for (var i = 0; i < vector.length; ++i) {
			ret[i] = vector[i] / s;
		}
		return ret;
	}
	function add(a, b) {
		if (a.length != b.length) {
			alert("Addtion error");
			return null;
		}
		var ret = new Array(a.length);
		for (var i = 0; i < a.length; ++i) {
			ret[i] = a[i] + b[i];
		}
		return ret;
	}
	function subtract(a, b) {
		if (a.length != b.length) {
			alert("Subtraction error");
			return null;
		}
		var ret = new Array(a.length);
		for (var i = 0; i < a.length; ++i) {
			ret[i] = a[i] - b[i];
		}
		return ret;
	}
	function divide(vector, d) {
		if (d == 0) {
			alert("divisor is zero!");
			return null;
		}
		var ret = new Array(vector.length);
		for (var i = 0; i < vector.length; ++i) {
			ret[i] = vector[i] / d;
		}
		return ret;
	}
	function multiply(a, b) {
		if (a.length != b.length) {
			alert("Multiplication error");
			return null;
		}
		var ret = 0;
		for (var i = 0; i < a.length; ++i) {
			ret += a[i] * b[i];
		}
		return ret;
	}

	// Calculate the position of light
	function calcuLightPos() {
		var sx = light[0]*light[0];
		var sy = light[1]*light[1];
		var sr = radius*radius;
		if (sx+sy > sr) {
			var scale = Math.sqrt(sr/(sx+sy));
			light[0] = light[0] * scale;
			light[1] = light[1] * scale;
		}
		light[0] = kr * (light[0] / radius);
		light[1] = kr * (light[1] / radius);
		light[2] = Math.sqrt(getMax(1 - light[0]*light[0] - light[1]*light[1], 0.0));
	}

	// Render the compass and the image
	function render() {
		var can = $("canvas#compass_canvas")[0];
		var context = can.getContext("2d");
		context.clearRect(0, 0, 2*harf_compass, 2*harf_compass);

		var compass = context.getImageData(harf_compass-radius, harf_compass-radius, 2*radius, 2*radius);
		for (var j = 0; j < 2*radius; ++j) {
			for (var i = 0; i < 2*radius; ++i) {
				var x = i - radius;
				var y = radius - j;
				if (x*x + y*y > radius*radius) continue;
				x = x / radius;
				y = y / radius;
				var z = getMax(Math.sqrt(1 - x*x - y*y), 0.0);
				// phong model
				var light_x = 2*light[0] - x;
				var light_y = 2*light[1] - y;
				var light_z = 2*light[2] - z;
				var vx = 0.0 - x;
				var vy = 0.0 - y;
				var vz = 1.1 - z;
				var hx = vx + light_x;
				var hy = vy + light_y;
				var hz = vz + light_z;
				var s = Math.sqrt(light_x*light_x + light_y*light_y + light_z*light_z);
				light_x /= s;
				light_y /= s;
				light_z /= s;
				s = Math.sqrt(hx*hx + hy*hy + hz*hz);
				hx /= s;
				hy /= s;
				hz /= s;
				// diffuse
				var diffuse = 1.9 * getMax(x*light_x + y*light_y + z*light_z, 0.0);
				// specular
				var specular = 0.5 * Math.pow(x*hx + y*hy + z*hz, 8);
				// ambient
				var ambient = 0.1;

				var value = ambient + diffuse;
				var index = j*2*radius*4 + i*4;
				compass.data[index] = getMin(0x00 * value, 255);
				compass.data[index+1] = getMin(0x66 * value, 255);
				compass.data[index+2] = getMin(0x00 * value, 255);
				compass.data[index+3] = 255;
			}
		}
		context.putImageData(compass, harf_compass-radius, harf_compass-radius);

		// render image
		if (floatPixels == null)
			return;
		can = $("canvas#image_canvas")[0];
		can.width = width;
		can.height = height;
		context = can.getContext("2d");
		context.clearRect(0, 0, can.width, can.height);
		imgData = context.createImageData(width, height);
		switch (extension) {
			case "rti":
				renderImageHSH();
				break;
			case "ptm":
				renderImagePTM();
				break;
			default:
				alert("Error: undefined file extension!");
		}
		context.putImageData(imgData, 0, 0);
	}

	function loadFile(raw_file) {
		switch (extension) {
			case "rti":
				return loadHSH(raw_file);
			case "ptm":
				return loadPTM(raw_file);
			default:
				alert("Error: undefined file extension!");
				return null;
		}
	}

	// Render the image using data in HSH file
	function renderImageHSH() {
		var weights = new Array();
		var phi = Math.atan2(light[1], light[0]);
		if (phi < 0) phi += 2*PI;
		var theta = Math.acos(light[2]);
		
		weights[0] = 1/Math.sqrt(2*PI);
		weights[1]  = Math.sqrt(6/PI)      *  (Math.cos(phi)*Math.sqrt(Math.cos(theta)-Math.cos(theta)*Math.cos(theta)));
		weights[2]  = Math.sqrt(3/(2*PI))  *  (-1 + 2*Math.cos(theta));
		weights[3]  = Math.sqrt(6/PI)      *  (Math.sqrt(Math.cos(theta) - Math.cos(theta)*Math.cos(theta))*Math.sin(phi));

		weights[4]  = Math.sqrt(30/PI)     *  (Math.cos(2*phi)*(-Math.cos(theta) + Math.cos(theta)*Math.cos(theta)));
		weights[5]  = Math.sqrt(30/PI)     *  (Math.cos(phi)*(-1 + 2*Math.cos(theta))*Math.sqrt(Math.cos(theta) - Math.cos(theta)*Math.cos(theta)));
		weights[6]  = Math.sqrt(5/(2*PI))  *  (1 - 6*Math.cos(theta) + 6*Math.cos(theta)*Math.cos(theta));
		weights[7]  = Math.sqrt(30/PI)     *  ((-1 + 2*Math.cos(theta))*Math.sqrt(Math.cos(theta) - Math.cos(theta)*Math.cos(theta))*Math.sin(phi));
		weights[8]  = Math.sqrt(30/PI)     *  ((-Math.cos(theta) + Math.cos(theta)*Math.cos(theta))*Math.sin(2*phi));

		weights[9]   = 2*Math.sqrt(35/PI)  *  Math.cos(3*phi)*Math.pow(Math.cos(theta) - Math.cos(theta)*Math.cos(theta),(3/2));
		weights[10]  = (Math.sqrt(210/PI)  *  Math.cos(2*phi)*(-1 + 2*Math.cos(theta))*(-Math.cos(theta) + Math.cos(theta)*Math.cos(theta)));
		weights[11]  = 2*Math.sqrt(21/PI)  *  Math.cos(phi)*Math.sqrt(Math.cos(theta) - Math.cos(theta)*Math.cos(theta))*(1 - 5*Math.cos(theta) + 5*Math.cos(theta)*Math.cos(theta));
		weights[12]  = Math.sqrt(7/(2*PI)) *  (-1 + 12*Math.cos(theta) - 30*Math.cos(theta)*Math.cos(theta) + 20*Math.cos(theta)*Math.cos(theta)*Math.cos(theta));
		weights[13]  = 2*Math.sqrt(21/PI)  *  Math.sqrt(Math.cos(theta) - Math.cos(theta)*Math.cos(theta))*(1 - 5*Math.cos(theta) + 5*Math.cos(theta)*Math.cos(theta))*Math.sin(phi);
		weights[14]  = (Math.sqrt(210/PI)  *  (-1 + 2*Math.cos(theta))*(-Math.cos(theta) + Math.cos(theta)*Math.cos(theta))*Math.sin(2*phi));
		weights[15]  = 2*Math.sqrt(35/PI)  *  Math.pow(Math.cos(theta) - Math.cos(theta)*Math.cos(theta),(3/2))*Math.sin(3*phi);

		var p = 0;
		for (var j = 0; j < height; ++j)
			for (var i = 0; i < width; ++i) {
				var index = j*width*4 + i*4;
				imgData.data[index + 3] = 255;
				for (var d = 0; d < dimension; ++d) {
					var value = 0;
					for (var q = 0; q < terms; ++q) {
						value += floatPixels[p++] * weights[q];
					}
					value = getMin(value, 1.0);
					value = getMax(value, 0.0);
					imgData.data[index + d] = Math.round(value * 255);
				}
			}
	}

	function loadHSH(raw_file) {
		var p = 0;
		var hshpixels = null;
		var scale = new Array();
		var bias = new Array();

		// remove the comment
		while (raw_file.charAt(p) == '#') {
			p = raw_file.indexOf('\n', p) + 1;
		}

		// RTI Type
		q = raw_file.indexOf('\n', p);
		type = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Image Width
		q = raw_file.indexOf(' ', p);
		width = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Image Height
		q = raw_file.indexOf(' ', p);
		height = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Color Dimension
		q = raw_file.indexOf('\n', p);
		dimension = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Basis_terms
		q = raw_file.indexOf(' ', p);
		terms = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Basis_type
		q = raw_file.indexOf(' ', p);
		basis_type = parseInt(raw_file.substring(p, q));
		p = q + 1;
		// Element Size
		q = raw_file.indexOf('\n', p);
		element_size = parseInt(raw_file.substring(p, q));
		p = q + 1;

		// scale
		for (var i = 0; i < terms; ++i) {
			var value = 0;
			for (var c = 0; c < 4; ++c) {
				// little endian
				value += raw_file.charCodeAt(p++) << (c*8);
			}
			scale[i] = Bytes2Float32(value);
		}
		// bias
		for (var i = 0; i < terms; ++i) {
			var value = 0; 
			for (var c = 0; c < 4; ++c) {
				// little endian
				value += raw_file.charCodeAt(p++) << (c*8);
			}
			bias[i] = Bytes2Float32(value);
		}

		// data
		hshpixels = new Array(width * height * dimension * terms);
		var index = 0;
		for (var j = 0; j < height; ++j)
			for (var i = 0; i < width; ++i)
				for (var d = 0; d < dimension; ++d) 
					for (var q = 0; q < terms; ++q) {
						var c = raw_file.charCodeAt(p++);
						var value = c / 255.0;
						value = value * scale[q] + bias[q];
						hshpixels[index++] = value;
					}

		return hshpixels;
	}

	function renderImagePTM() {
		var a = new Array(6);
		var index = 0;
		var p = 0;
		var viewpoint = new Array(0, 0, 1);

		for (var y = 0; y < height; ++y) {
			for (var x = 0; x < width; ++x) {
				for (var d = 0; d < 6; ++d) {
					a[d] = floatPixels[index++];
				}
				var r = floatPixels[index++];
				var g = floatPixels[index++];
				var b = floatPixels[index++];

				// get the luminance value
				var lum = a[0]*light[0]*light[0] + a[1]*light[1]*light[1] + a[2]*light[0]*light[1] + a[3]*light[0] + a[4]*light[1] + a[5];
				lum = lum / 255;

				// if (isDiffuse || isSpecular) {
				// 	// light direction
				// 	var s = Math.sqrt(width*width + height*height) / 2;
				// 	var u = (x - width / 2) / s;
				// 	var v = (height / 2 - y) / s;
				// 	var lightDir = subtract(light, new Array(u, v, 0));
				// 	lightDir = normalize(lightDir);

				// 	// diffuse 
				// 	var kd = 0.4;
				// 	if (isDiffuse) {
				// 		var diffuse = limit(multiply(light, normalMap[y][x]), 0, 1);
				// 		r = Math.round(r*kd*diffuse);
				// 		g = Math.round(g*kd*diffuse);
				// 		b = Math.round(b*kd*diffuse);
				// 	}

				// 	// specular
				// 	var ks = 0.7;
				// 	if (isSpecular) {
				// 		var n = 15;
				// 		var h = normalize(divide(add(viewpoint, lightDir), 2));
				// 		var specular = Math.pow(limit(multiply(h, normalMap[y][x]), 0, 1), n);
				// 		specular *= ks*255;
				// 		r = Math.round((r*kd + specular) * lum);
				// 		g = Math.round((g*kd + specular) * lum);
				// 		b = Math.round((b*kd + specular) * lum);
				// 	}
				// } else {
				// 	r = Math.round(r * lum);
				// 	g = Math.round(g * lum);
				// 	b = Math.round(b * lum);
				// }				

				// RGBA
				imgData.data[p++] = limit(r, 0, 255);
				imgData.data[p++] = limit(g, 0, 255);
				imgData.data[p++] = limit(b, 0, 255);
				imgData.data[p++] = 255;
			}
		}
	}

	function loadPTM(raw_file) {
		var p = 0;
		var hshpixels = null;
		var scale = new Array();
		var bias = new Array();

		// PTM version
		var q = raw_file.indexOf('\n', p);
		var version = raw_file.substring(p, q).trim();
		p = q + 1;
		if (version.match(/^PTM_\d\.\d$/) == null) {
			alert("Wrong PTM file format");
			return null;
		}

		// format of file
		q = raw_file.indexOf('\n', p);
		type = raw_file.substring(p, q).trim();
		p = q + 1;

		// image size
		q = raw_file.indexOf('\n', p);
		width = parseInt(raw_file.substring(p, q).trim());
		p = q + 1;
		q = raw_file.indexOf('\n', p);
		height = parseInt(raw_file.substring(p, q).trim());
		p = q + 1;

		// scale and bias
		q = raw_file.indexOf('\n', p);
		var str = raw_file.substring(p, q).trim();
		p = q + 1;
		var array = str.split(' ');
		if (array.length != 6 && array.length != 12) {
			alert('Wrong PTM file format');
			return null;
		}
		for (var i = 0; i < 6; ++i) {
			scale[i] = parseFloat(array[i]);
		}
		var tmp = 6;
		if (array.length == 6) {
			q = raw_file.indexOf('\n', p);
			array = raw_file.substring(p, q).trim().split(' ');
			p = q + 1;
			tmp = 0;
		}
		for (var i = 0; i < 6; ++i) {
			bias[i] = parseInt(array[tmp + i]);
		}

		// load coefficients according to different file format
		hshpixels = new Array(width * height * 9);
		normalMap = new Array(height);
		for (var y = 0; y < height; ++y) {
			normalMap[y] = new Array(width);
			for (var x = 0; x < width; ++x) {
				normalMap[y][x] = new Array(3);
			}
		}
		switch (type) {
			case "PTM_FORMAT_LRGB": {
				var index = 0;
				var n;
				for (var y = height - 1; y >= 0; --y) {
					for (var x = 0; x < width; ++x) {
						index = (y * width + x) * 9;
						var value;
						var d;
						var a = new Array(6);
						for (d = 0; d < 6; ++d) {
							value = raw_file.charCodeAt(p++);
							a[d] = Math.round((value - bias[d]) * scale[d]);
							hshpixels[index++] = a[d];
						}
						normalMap[y][x] = calculateNormal(a);
						if (version == "PTM_1.1") {
							for (d = 0; d < 3; ++d) {
								hshpixels[index++] = raw_file.charCodeAt(p++);
							}
						}
					}
				}
				if (version == "PTM_1.2") {
					for (var y = height - 1; y >= 0; --y) {
						for (var x = 0; x < width; ++x) {
							index = (y * width + x) * 9 + 6;
							for (d = 0; d < 3; ++d) {
								hshpixels[index++] = raw_file.charCodeAt(p++);
							}
						}
					}
				}
				return hshpixels;
			}
		}
	}

	function calculateNormal(coefficients) {
		var a = new Array();
		for (var k = 0; k < 6; ++k) {
			a[k] = coefficients[k] / 256;
		}
		var nx, ny, nz;
		// nx = (a[2]*a[4] - 2*a[1]*a[3]) / (4*a[0]*a[1] - a[2]*a[2])
		// ny = (a[2]*a[3] - 2*a[0]*a[4]) / (4*a[0]*a[1] - a[2]*a[2])
		if (Math.abs(4*a[0]*a[1] - a[2]*a[2]) < zerotol) {
			nx = 0;
			ny = 0;
		} else {
			if (Math.abs(a[2]) < zerotol) {
				nx = a[3] / (2 * a[0]);
				ny = a[4] / (2 * a[1]);
			} else {
				nx = (a[2]*a[4] - 2*a[1]*a[3]) / (4*a[0]*a[1] - a[2]*a[2]);
				ny = (a[2]*a[3] - 2*a[0]*a[4]) / (4*a[0]*a[1] - a[2]*a[2]);
			}
		}

		if (Math.abs(a[0]) < zerotol && Math.abs(a[1]) < zerotol && Math.abs(a[2]) &&
			Math.abs(a[3]) < zerotol && Math.abs(a[4]) < zerotol && Math.abs(a[5])) {
			nz = 1;
		} else {
			var s = nx*nx + ny*ny;
			if (s > 1) {
				s = Math.sqrt(s);
				nx = nx / s;
				ny = ny / s;
				nz = 0;
			} else {
				nz = Math.sqrt(1 - s);
			}
		}

		return Array(nx, ny, nz);
	}

	function Bytes2Float32(bytes) {
		var sign = (bytes & 0x80000000) ? -1 : 1;
		var exponent = ((bytes >> 23) & 0xFF) - 127;
		var significand = (bytes & ~(-1 << 23));

		if (exponent == 128) 
			return sign * ((significand) ? Number.NaN : Number.POSITIVE_INFINITY);
		
		if (exponent == -127) {
			if (significand == 0) 
				return sign * 0.0;
			exponent = -126;
			significand /= (1 << 22);
		} else {
			significand = (significand | (1 << 23)) / (1 << 23);
		}

		return sign * significand * Math.pow(2, exponent);
	}

	function fetchRemoteData() {
		// var select = $("select#demos")[0];
		// filename = select.options[select.selectedIndex].value;
		filename = "vase.rti";
		extension = filename.substring(filename.lastIndexOf('.')+1).trim();
		$.ajax({
			type: 'get',
			async: false,
			url: dataURL+filename+'.js',
			dataType: 'jsonp',
			jsonp: "callback",
			jsonpCallback: "handleDemo",

			success: function(json) {
				var result = window.atob(json.data);
				// load raw file and render
				floatPixels = loadFile(result);
				render();
			},
			error: function(json) {
				alert('Fetch file error');
			}
		});
	}

	/******* Events *******/
	// compass_canvas
	$("canvas#compass_canvas").mousedown(function() {
		if (mousedown_compass) 
			return;
		mousedown_compass = true;
	});
	$("canvas#compass_canvas").mouseup(function() {
		if (!mousedown_compass)
			return;
		mousedown_compass = false;
	});
	$("canvas#compass_canvas").mousemove(function(e) {
		if (!mousedown_compass) 
			return;
		var p = $("canvas#compass_canvas").offset();
		light[0] = getMin(e.pageX-p.left, 2*harf_compass) - harf_compass;
		light[1] = harf_compass - getMin(e.pageY-p.top, 2*harf_compass);
		// $("#compass_pos").text(light[0] + "," + light[1]);
		calcuLightPos();
		render(); 
	});
	$("canvas#compass_canvas").mouseout(function() {
		mousedown_compass = false;
	});

	// image_canvas
	$("canvas#image_canvas").mousedown(function(e) {
		if (mousedown_image) 
			return;
		mousedown_image = true;
		old_x = e.pageX;
		old_y = e.pageY;
	});
	$("canvas#image_canvas").mouseup(function() {
		if (mousedown_image)
			mousedown_image = false;
	});
	$("canvas#image_canvas").mousemove(function(e) {
		if (!mousedown_image)
			return;
		
		var offsetX = e.pageX - old_x;
		var offsetY = e.pageY - old_y;
		old_x = e.pageX;
		old_y = e.pageY;
		light[0] = light[0] / kr * radius + offsetX;
		light[1] = light[1] / kr * radius - offsetY;

		calcuLightPos();
		render();
	});
	$("canvas#image_canvas").mouseout(function() {
		mousedown_image = false;
	}); 

	// // File loading
	// $("input#file-select").change(function(e) {
	// 	var image = this.files[0];
	// 	if (!image.name.match(/(.rti)|(.ptm)$/)) {
	// 		alert("Only rti and ptm Files Are Accepted.");
	// 		return;
	// 	}
	// 	var imageReader = new FileReader();
		
	// 	imageReader.onload = (function(f) {
	// 		filename = f.name;
	// 		extension = filename.substring(filename.lastIndexOf('.')+1).trim();
	// 		return function(e) {
	// 			// get the file data
	// 			var result = e.currentTarget.result;
	// 			// load raw file and render
	// 			floatPixels = loadFile(result);
	// 			render();
	// 		};
	// 	})(image);
	// 	var result = imageReader.readAsBinaryString(image);
	// });

	// $("select#demos").change(function() {
	// 	fetchRemoteData();
	// });

	// $("input#default").change(function() {
	// 	isDefault = this.checked;
	// 	render();
	// });

	// $("input#diffuse").change(function() {
	// 	isDiffuse = this.checked;
	// 	render();
	// });

	// $("input#specular").change(function() {
	// 	isSpecular = this.checked;
	// 	render();
	// });

	// load a demo when page is ready
	fetchRemoteData();

});
	