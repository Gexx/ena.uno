var obj = {};

var re = /([a-z]+)\b/gmi;
var str = 'Adam Alan Aldo Alex Andy Ben Blake Charlie Chris Cole Dane Dave Enzo Eric Ethan Evan Felix Franz Gary Ian Jack James Jason Jay John Josh Luke Mark Matt Max Miles Nate Nico Paul Pax Price Ray Rich Roan Ross Ryan Sam Scott Sean Shay Ted Theo Tom Troy Ty Van Will Zack Zev Abby Alice Ally Amy Angel Anna Anne Anya April Asia Ava Bay Becca Becky Beth Brooke Cara Charlie Cindy Claire Daisy Della Ella Elsa Emma Eve Faith Grace Hana Iris Isis Isla Ivy Jade Jana Jenna Jill Jolie Joy Julie June Juno Kate Kathy Katie Kelly Kerry Kim Kitty Lily Lisa Liz Liza Lola Luz Maddie Maggie Mara Mary Maya May Misha Molly Nell Nora Oona Oria Paige Rain Raven Rhea Rose Sana Sandy Sarah Sasha Tara Uma Vera Vicky Zadie Zara';

obj.names = str.match(re);

obj.randomIntInc = function (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
};

obj.getRandomName = function () {
	var name = this.names[ this.randomIntInc(0, this.names.length - 1) ];
    return name.toString();
};

// Export module public functions
module.exports = obj;