/*
	Simple Radial progress with d3 framework.
*/

var RadialProgress = function(id){
	id = id || '#radial-progress';

	var colors = {
		'pink': '#E1499A',
		'red': '#ea003d',
		'yellow': '#f0ff08',
		'green': '#47e495'
	};
	
	var color = colors.green;
	
	var radius = 45;
	var border = 15;
	var padding = 7;
	
	var twoPi = Math.PI * 2;
	var formatPercent = d3.format('.0%');
	var boxSize = (radius + padding) * 2;
	
	var arc = d3.arc()
		.startAngle(0)
		.innerRadius(radius)
		.outerRadius(radius - border);
	
	var parent = d3.select(id);
	
	var svg = parent.append('svg')
		.attr('class', 'd3')
		.attr('width', boxSize)
		.attr('height', boxSize);
		
	var defs = svg.append('defs');
	
	var g = svg.append('g')
		.attr('transform', 'translate(' + boxSize / 2 + ',' + boxSize / 2 + ')');
	
	var meter = g.append('g')
		.attr('class', 'progress-meter');
	
	meter.append('path')
		.attr('class', 'background')
		.attr('fill', '#ccc')
		.attr('fill-opacity', 0.5)
		.attr('d', arc.endAngle(twoPi));
	
	var foreground = meter.append('path')
		.attr('class', 'foreground')
		.attr('fill', color)
		.attr('fill-opacity', 1)
		.attr('stroke', color)
		.attr('stroke-width', 5)
		.attr('stroke-opacity', 1)
		.attr('filter', 'url(#blur)');
	
	var front = meter.append('path')
		.attr('class', 'foreground')
		.attr('fill', color)
		.attr('fill-opacity', 1);
	
	var numberText = meter.append('text')
		.style("font-size","20px")
		.attr('fill', '#333')
		.attr('text-anchor', 'middle')
		.attr('dy', '.35em');
	
	function updateProgress(progress, text, color) {
		color = color || "#47e495";
		foreground.attr('d', arc.endAngle(twoPi * progress));
		front.attr('d', arc.endAngle(twoPi * progress));
		
		foreground.attr('fill', color);
		front.attr('fill', color);
		
		if(text){
			numberText.text(text);
		}else{
			numberText.text("0");
		}
	}
	
	updateProgress( 0 , "0", color.red);

	return {"Update": updateProgress};
};