// Script: [script name]
// Developer: Gage Coates
// Date: [date]

document.oncontextmenu = function () {
	return false;
}
var game;
// gets called once the html is loaded
function initialize() {
	game = new Game();
	// start the updates
	game.initialize();
}
var voxelData = {
	'Thorium': {
		type: 'fuel_rod',
		sprite: 'sprites/thorium.png',
		pressure: 125,
		rate: 5,
		price: 100,
		meltingPoint: 1,
	},
	'Uranium': {
		type: 'fuel_rod',
		sprite: 'sprites/uranium.png',
		pressure: 3000,
		rate: 10,
		price: 2000,
		meltingPoint: 2,
	},
	'Plutonium': {
		type: 'fuel_rod',
		sprite: 'sprites/plutonium.png',
		pressure: 20000,
		rate: 50,
		price: 10000,
		meltingPoint: 3,
	},
	'Depleted fuel': {
		type: 'depleted_fuel',
		sprite: 'sprites/depleted_fuel.png',
		meltingPoint: 1,
	},
	'Molten fuel': {
		type: 'molten_fuel_rod',
		sprite: 'sprites/molten_fuel_rod.png',
		meltingPoint: 1,
	},
	'Control rod': {
		type: 'control_rod',
		sprite: 'sprites/control_rod.png',
		price: 75,
		meltingPoint: 1,
	},
	'Standard casing': {
		type: 'casing',
		sprite: 'sprites/casing.png',
		health: 16,
		price: 50,
		meltingPoint: 1,
	},
	'Galvanized casing': {
		type: 'casing',
		sprite: 'sprites/galvanized_casing.png',
		health: 16,
		price: 1000,
		meltingPoint: 2,
	},
	'Molten metal': {
		type: 'molten_metal',
		sprite: 'sprites/molten_metal.png',
		meltingPoint: 1,
		price: 0,
	},
	'Coolant': {
		type: 'coolant',
		sprite: 'sprites/water.gif',
		meltingPoint: 1,
	},
	'Coolant ejector': {
		type: 'coolant_ejector',
		sprite: 'sprites/coolant_ejector.png',
		price: 75,
		rate: 1,
		meltingPoint: 1,
	}
}
// Game wrapper
function Game() {
	// private
	this.info = document.createElement('DIV');
	this.grid; // Grid class
	this.heat; // heat view settings
	this.selection =  []; // block selection
	this.selected; // currently selected voxel type
	this.pressureSum = 0;
	this.money = 1000;
	this.previousMoney;
	this.lastFrame = Date.now();
	// mouse
	this.mouse = {
		left: false,
		middle: false,
		right: false
	};
	this.reload = function () {
		var self = this;
		clearInterval(self.interval);
		window.location.reload();
	};
	this.start = function (delay) {
		var self = this;
		self.interval = window.setInterval(function () {
			var elapsed = (Date.now() - self.lastFrame);
			// update the simulation
			var blocks = self.grid.update();
			// fuel rods create pressure
			blocks.fuelRods.forEach(function (fuel) {
				if (fuel.health > 0) {
					fuel.addPressure((1/60)*voxelData[fuel.name].rate);
					fuel.addHealth(-((1/60)*voxelData[fuel.name].rate)/voxelData[fuel.name].pressure);
				} else {
					fuel.initialize('Depleted fuel');
					fuel.setHealth(0);
				}
			});
			// pressure damages casings
			blocks.casings.forEach(function (casing) {
				self.damageVoxel(casing);
			});
			// eject pressure
			blocks.coolantEjectors.forEach(function (ejector) {
				self.damageVoxel(ejector);
				var transfer = ejector.pressure * voxelData[ejector.name].rate;
				self.pressureSum += transfer;
				// reset the ejector
				ejector.addPressure(-transfer);
			});
			self.previousMoney = self.money;
			self.money += self.pressureSum;
			self.pressureSum = 0;
			// update money supply
			self.info.innerHTML = '$' + printWithCommas(Math.floor(self.money)) + '<br>' + 'Rate: ' + ((self.money-self.previousMoney)/(1/60)).toFixed(3) + ' $/sec';
		}, delay);
	}
	this.damageVoxel = function (voxel) {
		if (voxel.pressure >= voxel.meltingPoint) {
			voxel.addHealth(-(1/60)/voxelData[voxel.name].health);
		}
		if (voxel.health < 0) {
			voxel.initialize('Molten metal');
			voxel.setHealth(0);
		}
	}
	this.stop = function () {
		window.clearInterval(this.interval);
	}
	this.interval;
	this.initialize = function () {
		var self = this;
		// info
		self.info.className = 'info';
		// heat slider
		var heatDiv = document.createElement('DIV');
		heatDiv.innerHTML = 'heat display sensitivity';
		self.heat = document.createElement('INPUT');
		self.heat.type = 'range';
		self.heat.min = 1;
		self.heat.max = 2;
		self.heat.step = 0.125;
		self.heat.value = 1;
		heatDiv.appendChild(self.heat);
		// block selection
		var table = document.createElement('TABLE');
		table.style.display = 'inline-block';
		for (var type in voxelData) {
			// blacklist unplaceable types
			if (['Coolant','Molten fuel','Molten metal','Depleted fuel'].indexOf(type) == -1) {
				var row = document.createElement('TR');
				// name
				var name = document.createElement('TD');
				name.className = 'select';
				name.innerHTML = type;
				row.appendChild(name);
				// image
				var sprite = document.createElement('TD');
				var voxel = new Voxel(type,true);
				self.selection.push(voxel);
				sprite.appendChild(voxel.sprite);
				row.appendChild(sprite);
				// price
				var price = document.createElement('TD');
				price.className = 'select';
				price.innerHTML = '$' + printWithCommas(voxelData[type].price);
				row.appendChild(price);
				
				table.appendChild(row);
			}
		}
		// grid
		self.grid = new Grid(9,9);
		// append everything to the body
		var body = document.getElementById('body');
		body.appendChild(self.info);
		body.appendChild(heatDiv);
		body.appendChild(self.grid.table);
		body.appendChild(table);
		// mouse
		window.addEventListener('mousedown', function (event) {
			switch (event.which) {
				case 1: self.mouse.left = true; break;
				case 2: self.mouse.middle = true; break;
				case 3: self.mouse.right = true; break;
			}
			return false;
		});
		window.addEventListener('mouseup', function (event) {
			switch (event.which) {
				case 1: self.mouse.left = false; break;
				case 2: self.mouse.middle = false; break;
				case 3: self.mouse.right = false; break;
			}
			return false;
		});
		game.start(100/6);
	}
}
function Grid(width,height) {
	// public
	this.update = function () {
		var self = this;
		// non-coolant blocks
		var special = {coolantInjectors: [], coolantEjectors: [], fuelRods: [], casings: []};
		// pressure simulation
		var add = [];
		for (var i = 0; i < self.data.length; i++) {
			add.push([]);
			for (var j = 0; j < self.data.length; j++) {
				add[i].push(0);
			}
		}
		for (var x = 0; x < self.data.length; x++) {
			for (var y = 0; y < self.data.length; y++) {
				var cell = self.data[x][y];
				// catalogue special blocks
				if (voxelData[cell.name].type == 'coolant_ejector'){
					if (cell.pressure >= cell.meltingPoint) {
						cell.initialize('Molten metal');
						cell.setHealth(0);
					} else {
						special.coolantEjectors.push(cell);
					}
				} else if (voxelData[cell.name].type == 'fuel_rod') {	
					if (cell.pressure >= cell.meltingPoint) {
						cell.initialize('Molten fuel');
						cell.setHealth(0);
					} else {
						special.fuelRods.push(cell);
					}
				} else if (voxelData[cell.name].type == 'casing') {
					special.casings.push(cell);
				}
				// pressure simulation
				var adjacent  = [];
				for (var rot = 0; rot< 2; rot += 0.5) {
					var adjX = x + Math.round(Math.cos(rot*Math.PI));
					var adjY = y + Math.round(Math.sin(rot*Math.PI));
					if (adjY >= 0 && adjY <= self.data.length-1 && adjX >= 0 && adjX <= self.data.length-1) {
						if (voxelData[self.data[adjX][adjY].name].type != 'casing' || voxelData[cell.name].type == 'casing') {
							adjacent.push({pressure: self.data[adjX][adjY].pressure,x:adjX,y:adjY});
						}
					} else if (cell.pressure > 0 && voxelData[cell.name].type != 'casing' && voxelData[cell.name].type != 'coolant_ejector') {
						if (window.confirm('Reactor breach!')) {
							game.reload();
						}
					}
				}
				// add this cell to the calculations
				adjacent.push({pressure: cell.pressure,x:x,y:y});
				// calculate equalized pressure
				var equalized = 0;
				adjacent.forEach(function (adjacentCell) {
					equalized += adjacentCell.pressure;
				});
				equalized /= adjacent.length;
				// add pressure
				var equalizationConstant = 1;
				add[x][y] += (equalized-cell.pressure) * equalizationConstant;
			}
		}
		// sum up pressures
		for (var x = 0; x < self.data.length; x++) {
			for (var y = 0; y < self.data.length; y++) {
				self.data[x][y].addPressure(add[x][y]);
			}
		}
		// return a catalogue of jectors
		return special;
	}
	// private
	this.table = document.createElement('TABLE');
	this.data = [];
	this.initialize = function (width, height) {
		var self = this;
		// html table
		self.table.className = 'grid';
		for (var y = 0; y < height; y++) {
			// rows
			self.data.push([]);
			var row = document.createElement('TR');
			for (var x = 0; x < width; x++) {
				// voxels
				var voxel = new Voxel('Coolant');
				voxel.setPressure(0);
				var cell = document.createElement('TD');
				cell.style.border = '0px';
				cell.appendChild(voxel.sprite);
				row.appendChild(cell);
				self.data[y].push(voxel);
			}
			self.table.appendChild(row);
		}
	}
	this.initialize(width, height);
}
function Voxel(name,select) {
	// public
	this.updateSprite = function () {
		var self = this;
		if (self.pressure != null) {
			self.overlay.style.backgroundColor = 'rgba(255,0,0,' + (self.pressure/self.meltingPoint)/game.heat.value + ')';
		} else {
			self.overlay.style.backgroundColor = null;
		}
	}
	this.setHealth = function (health)  {
		var self = this;
		self.health = health;
		self.healthBar.style.width = self.health*100 + '%';
		var green = Math.floor((self.health)*255);
		var red = Math.floor((1 - self.health)*255);
		self.healthBar.style.backgroundColor = 'rgb(' + red + ',' + green + ',0)';
	}
	this.addHealth = function (health) {
		var self = this;
		self.setHealth(self.health+health);
	}
	this.setPressure = function (pressure) {
		this.pressure = pressure;
		this.updateSprite();
	}
	this.addPressure = function (pressure) {
		var self = this;
		if (self.pressure != null) {
			self.pressure += pressure;
			self.updateSprite();
		}
	}
	// private
	this.sprite = document.createElement('DIV');
	this.overlay = document.createElement('DIV');
	this.healthBar = document.createElement('DIV');
	this.tip = document.createElement('DIV');
	// data
	this.select = select;
	this.name;
	this.health = 0;
	this.pressure = 0;
	this.meltingPoint;
	this.initialize = function (name,select) {
		var self = this;
		if (name === null || name === undefined) {
			self.initialize('Casing',select);
		}
		// data
		self.select = select;
		self.name = name;
		self.setHealth(0);
		self.meltingPoint = voxelData[self.name].meltingPoint;
		self.addHtml();
	}
	this.addHtml = function () {
		var self = this;
		self.sprite.className = 'sprite';
			self.sprite.innerHTML = '';
			if (self.pressure != null && !select) {
				self.sprite.style.backgroundImage = 'url(' + voxelData[self.name].sprite + '), url(' + voxelData['Coolant'].sprite + ')';
			} else {
				self.sprite.style.backgroundImage = 'url(' + voxelData[self.name].sprite + ')';
			}
			// heat overlay
			self.overlay.className = 'sprite';
			self.sprite.appendChild(self.overlay);
			self.updateSprite();
			// tip
			self.tip.className = 'tip';
			self.tip.innerHTML = self.name;
			self.sprite.appendChild(self.tip);
			// healthBar
			if (!select && voxelData[self.name].type != 'coolant') {
				self.healthBar.className = 'progress';
				self.setHealth(1);
				self.sprite.appendChild(self.healthBar);
			}
	}
	this.addEventListeners = function () {
		var self = this;
		self.sprite.addEventListener('mousedown', function (event) {
			self.placeVoxel(event.which == 1? true: false,event.which == 2? true: false,event.which == 3? true: false );
			if (self.select) {
				game.selected = self.name;
				game.selection.forEach(function (voxel) {
					voxel.sprite.className = 'sprite';
				})
				self.sprite.className = 'sprite selected';
			}
			event.preventDefault();
			return false;
		});
		self.sprite.addEventListener('mouseenter', function (event) {
			event.preventDefault();
			self.placeVoxel(game.mouse.left,game.mouse.middle,game.mouse.right);
		});
	}
	this.placeVoxel = function (left,middle,right) {
		var self = this;
		if (!self.select) {
			if (left) {
				if (game.selected != undefined && self.cost()) {
					if (voxelData[self.name].type == 'casing') {
						self.setPressure(0);
					}
					self.initialize(game.selected);
				}
			} else if (right) {
				self.initialize('Coolant');
			}
		}
	}
	this.cost = function () {
		var self = this;
		if (game.money >= voxelData[game.selected].price) {
				game.money -= voxelData[game.selected].price;
				return true;
		}
	}
	this.initialize(name,select);
	this.addEventListeners();
}
printWithCommas = function (x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}