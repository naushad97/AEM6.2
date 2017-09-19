/**
 * @class CQ.form.CreateVehicleGroupWidget
 * @extends CQ.Ext.CompositeMultiFieldWidget

 * This Widget is used for creating .
 * 
 * @constructor
 * 	Creates a new CreateVehicleGroupWidget
 * @param {Object} config - The config object
 * @xtype createVehicleGroupWidget
 * 
 * @author Naushad
 * 
 */

createVehicleGroupWidget = {};

CQ.form.CreateVehicleGroupWidget = CQ.Ext.extend(CQ.form.CompositeMultiFieldWidget, {

	/** private 
	 *  overriding CQ.Ext.Component#constructor
	 */
	constructor: function (config) {
		config = config || {};

		CQ.form.CreateVehicleGroupWidget.superclass.constructor.call(this, config);

	},

	/** private 
	 * overriding CQ.Ext.Component#initComponent constructor
	 */
	initComponent: function () {

		CQ.form.CreateVehicleGroupWidget.superclass.initComponent.call(this);

		//@TypeHint suffix is used to force storing the named parameter in a property with the given 
        this.typeHintField = new CQ.Ext.form.Hidden({
            name: this.name + CQ.Sling.TYPEHINT_SUFFIX,
            value: 'String' + "[]"
        });
		this.add(this.typeHintField);

        var dialog = this.findParentByType('dialog'),
			compositeMultifield = this.findParentByType('multifield');
             dialog.on('loadcontent',function(item, records){
                 this.findParentByType('multifielditem').hide();
       		 },this);
		},

    /**
	 * Overriding CQ.form.CompositeMultiFieldWidget#getJsonData
	 * Returns the JSON array string.
	 * @return {Mixed} value The field value
	 */
	getJsonData: function () {
		var val = [];
		var data = this.getValue();
        if(!CQ.Ext.isEmpty(data) && Object.keys(data).length > 0){
            val.push(JSON.stringify(data));
        }
		return val;
	},

    /**
	 * Overriding CQ.form.CompositeMultiFieldWidget#getFieldValue
	 * Returns the JSON.
	 * @return {Mixed} value The field value
	 */
	getFieldValue : function(item,collections){
        var value = item.getValue() || '';
        if(!CQ.Ext.isEmpty(value)){
            var key = item.key.replace('./', '');
            if(CQ.Ext.isArray(value)){
                var multiValue = new Array();
                value.forEach(function (i) {
                    multiValue.push(i.getValue());
                });
                value = multiValue;
            }
            collections[key] = value;
            //this will be used later on for populating selection box
            collections["text"] = value;
            collections["value"] = "vehgroup-"+value.trim().replace(/ +/g,'_').toLowerCase();
        }
        return collections; 
    },

    
    /**
     * Validates the field value
     * @return {Boolean} True if the value is valid, else false
     */
    validate: function() {
        //call super class validate method
        var isValid = CQ.form.CreateVehicleGroupWidget.superclass.validate.call(this);

        //check for blank and empty field
        if(isValid){
            var isBlank = CQ.Ext.isEmpty(this.getValue().text.trim());
            if(isBlank){
                isValid = false;
                this.items.get(0).markInvalid(CQ.I18n.getMessage("This field is required"));
            }
        }

        //proceed to duplicate check only if all other validation is passed
        if(!this.findParentByType("multifielditem").hidden && isValid){
            //get the dialog
            var dialog = this.findParentByType("dialog");
            //get all the multi-field list from the dialog of xtype - createVehicleGroupWidget
            var fields = dialog.findByType("createVehicleGroupWidget");

			//extract the values from the list of objects
            var filteredList = fields.map((currentValue, index, arr) =>{
                if(!_.isEmpty(currentValue.getValue()) && !(_.isEmpty(currentValue.getValue().text.trim()))) {
                 	return currentValue.getValue().text.trim().toLowerCase();
                }
            });

        	//collect the duplicate values from the list and mark these as invalid
            var duplicates =  filteredList.reduce((arr,item,index)=>{
                if(item && filteredList.indexOf(filteredList[index]) !== index){

                	arr.push(fields[index].items.get(0));

                	fields[index].items.get(0).markInvalid(CQ.I18n.getMessage("Duplicate groups are not allowed"));
                	isValid = false;
                }
            	return arr;
            },[]);
        }

        return isValid;
    },

    onResize: function (adjWidth, adjHeight, rawWidth, rawHeight) {
        if (adjWidth > 0) {
            CQ.form.CreateVehicleGroupWidget.superclass.onResize.call(this,adjWidth);
        }
    },

});

// register createVehicleGroupWidget xtype
CQ.Ext.reg('createVehicleGroupWidget', CQ.form.CreateVehicleGroupWidget);