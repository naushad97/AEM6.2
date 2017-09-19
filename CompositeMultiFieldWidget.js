/**
 * @class CQ.form.CompositeMultiFieldWidget
 * @extends CQ.Ext.CompositeField

 * This Widget extends the feature of multifield and add support for composite and nested multifield.
 * 
 * @Supports
    Rich Text Editor, 
    Pathfield, 
    Textfield,
	Textarea, 
    Radio, 
    Radiogroup, 
    Checkbox, 
    Checkboxgroup, 
    Dropdown, 
    Dialogfieldset,
    Image Drag and Drop feature restricted to Pathfield and RTE only.
 * 
 * @constructor
 * 	Creates a new CustomMultiFieldWidget.
 * @param {Object} config - The config object
 * @xtype customMultiFieldWidget
 * 
 * @author Naushad
 * 
 */
compositeMultiFieldWidget = {};

CQ.form.CompositeMultiFieldWidget = CQ.Ext.extend(CQ.form.CompositeField, {

    /**
     * @cfg {Hidden} hiddenField
     * Hidden Field path where values to be stored
     */
    hiddenField: null,

    totalPadding: 0,

    /** private 
     *  overriding CQ.Ext.Component#constructor
     */
    constructor: function(config) {
        config = config || {};
        if (!config.layout) {
            config.layout = 'form';
            config.padding = '10px';
            config.anchor = "100%";
            //config.typeHint="String";
        }
        var defaults = {
            "border": false,
            "layout": "form",
            "anchor": "100%",
            "style": "padding:5px;",
        };

        config = CQ.Util.applyDefaults(config, defaults);
        CQ.form.CompositeMultiFieldWidget.superclass.constructor.call(this, config);
    },

    /** private 
     * overriding CQ.Ext.Component#initComponent constructor
     */
    initComponent: function() {

        CQ.form.CompositeMultiFieldWidget.superclass.initComponent.call(this);

        this.hiddenField = new CQ.Ext.form.Hidden({
            name: this.name
        });

        this.add(this.hiddenField);

        //considering L-left and R-right padding as passed in the constructor config
        this.totalPadding = 2 * 10 + 2 * 5;

        var dialog = this.findParentByType('dialog'),
            compositeMultifield = this.findParentByType('multifield');

        dialog.on('loadcontent', function() {
            if (_.isEmpty(compositeMultifield.dropTargets)) {
                compositeMultifield.dropTargets = [];
            }

            compositeMultifield.dropTargets = compositeMultifield.dropTargets.concat(this.getDropTargets());

            _.each(compositeMultifield.dropTargets, function(target) {
                if (!target.highlight) {
                    return;
                }

                var dialogZIndex = parseInt(dialog.el.getStyle("z-index"), 10);

                if (!isNaN(dialogZIndex)) {
                    target.highlight.zIndex = dialogZIndex + 1;
                }
            });
        }, this);

        dialog.on('beforesubmit', function() {
            var jsonValue = this.getJsonData();

            if (jsonValue) {
                this.updateHidden(jsonValue);
            }

        }, this);

        if (dialog.compositeMultifieldInit) {
            return;
        }

        var tabPanel = compositeMultifield.findParentByType("tabpanel");

        if (tabPanel) {
            tabPanel.on("tabchange", function(panel) {
                panel.doLayout();
            });
        }

        dialog.on('hide', function() {
            var editable = CQ.utils.WCM.getEditables()[this.path];

            //remove from dialog cache
            delete editable.dialogs[CQ.wcm.EditBase.EDIT];
            delete CQ.WCM.getDialogs()["editdialog-" + this.path];
        }, dialog);

        dialog.compositeMultifieldInit = true;
    },

    // overriding CQ.form.CompositeField#setValue
    setValue: function(value) {

        if (typeof value === 'string') {
            value = JSON.parse(value);
            value = CQ.Ext.isArray(value) ? value[0] : value;
        }

        this.items.each(function(item, index) {
            try {

                //snippet for setting values of cqinclude dialogfieldset or simple dialogfieldset
                if (CQ.Ext.isFunction(item.findByType)) {
                    var fieldset = null;
                    if (item.isXType("dialogfieldset")) {
                        fieldset = item;
                    } else {
                        fieldset = item.findByType("dialogfieldset");
                        fieldset = CQ.Ext.isArray(fieldset) ? fieldset[0] : fieldset;
                    }
                    if (!_.isEmpty(fieldset) && CQ.Ext.isFunction(item.ownerCt.setDialogFieldSetValues)) {
                        item.ownerCt.setDialogFieldSetValues(fieldset, value);
                        return;
                    }
                }

                //handle other fields
                var xType = item.xtype;
                if (xType == "label" || xType == "hidden" || !item.hasOwnProperty("key")) {
                    return;
                }

                var key = item.key.replace('./', '');
                item.setValue(value[key]);
                item.setWidth(item.width);

                item.fireEvent('loadcontent', this);

            } catch (e) {
                CQ.Log.debug("CQ.form.CompositeMultiFieldWidget#setValue: " + e.message);
            }
        }, this);
    },

    setDialogFieldSetValues: function(fieldset, collections) {
        if (fieldset.key) {
            var fieldsetKey = fieldset.key.replace('./', '');
            var fieldsetvals = collections[fieldsetKey];

            fieldset.items.each(function(item, index /*, length*/ ) {
                var key = item.key.replace('./', '');
                item.setValue(fieldsetvals[key]);
                item.setWidth(item.width);
            });

        }
    },

    getJsonData: function() {
        var values = [];
        var fieldValues = this.getValue();
        if (!CQ.Ext.isEmpty(fieldValues) && Object.keys(fieldValues).length > 0) {
            values.push(JSON.stringify(fieldValues));
        }
        return values;

    },
    /**
     * Overriding CQ.form.CompositeField#getValue
     * Returns the normalized data value (undefined or emptyText will be
     * returned as "").  To return the raw value see {@link #getValue}.
     * @return {Mixed} value The field value
     */
    getValue: function() {
        return this.getFieldValues();
    },

    /**
     * @private
     * Returns the data value which may or may not be a valid, defined value.
     * To return a normalized value see {@link #getValue}.
     * @return {Mixed} value The field value
     */
    getFieldValues: function() {
        var collections = {};
        this.items.each(function(item, index /*, length*/ ) {
            try {

                //snippet for getting values of cq-include as dialogfieldset or simple dialogfieldset
                if (CQ.Ext.isFunction(item.findByType)) {
                    var fieldset = null;

                    if (item.isXType("dialogfieldset")) {
                        fieldset = item;
                    } else {
                        fieldset = item.findByType("dialogfieldset");
                        fieldset = CQ.Ext.isArray(fieldset) ? fieldset[0] : fieldset;
                    }

                    if (!_.isEmpty(fieldset) && CQ.Ext.isFunction(item.ownerCt.getDialogFieldSetValues)) {
                        collections = item.ownerCt.getDialogFieldSetValues(fieldset, collections);
                        return;
                    }
                }

                var xType = item.getXType();
                if (xType == "label" || xType == "hidden" || !item.hasOwnProperty("key")) {
                    return;
                }

                collections = this.ownerCt.getFieldValue(item, collections);

            } catch (e) {
                CQ.Log.debug("CQ.form.CompositeMultiFieldWidget#getFieldValues: " + e.message);
            }
        });

        return collections;
    },

    getFieldValue: function(item, collections) {
        var value = item.getValue() || '';
        var key = item.key.replace('./', '');

        //this is required to get value of check-box group
        if (item.isXType("checkboxgroup") && CQ.Ext.isArray(value) && Object.keys(value).length > 0) {
            var multiValue = new Array();
            value.forEach(function(i) {
                multiValue.push(i.getValue());
            });
            value = multiValue;
        }
        collections[key] = value;
        return collections;
    },

    getDialogFieldSetValues: function(fieldset, collections) {
        if (fieldset.key) {
            var fieldsetVals = {};
            var fieldsetKey = fieldset.key.replace('./', '');

            fieldset.items.each(function(item, index /*, length*/ ) {
                fieldsetVals = this.findParentByType("compositeMultiFieldWidget").getFieldValue(item, fieldsetVals);
            });

            collections[fieldsetKey] = fieldsetVals;
        }
        return collections;
    },

    // private hidden function
    updateHidden: function(value) {
        this.hiddenField.setValue(value);
    },

    validate: function() {
        var valid = true;

        this.items.each(function(i) {
            if (!i.hasOwnProperty("key") || i.disabled) {
                return;
            }

            if (!i.isVisible()) {
                i.allowBlank = true;
                return;
            }

            if (CQ.Ext.isFunction(i.validate) && !i.validate()) {
                valid = false;
            }
        });

        return valid;
    },

    //get drop targets - Hints - ACS common
    getDropTargets: function() {
        var targets = [],
            t;

        this.items.each(function() {
            if (!this.getDropTargets) {
                return;
            }

            t = this.getDropTargets();

            if (_.isEmpty(t)) {
                return;
            }

            targets = targets.concat(t);
        });

        return targets;
    },


    // private overriding CQ.Ext.Panel#onResize
    // this is needed for resizing rte beacuse in MF/nested-MF, 
    // all events of rte are not fired and dimensions are not set properly
    onResize: function(adjWidth, adjHeight, rawWidth, rawHeight) {
        if (adjWidth > 0) {
            for (var i = 0; i < this.items.length; i++) {
                try {

                    var item = this.items.get(i);
                    var xType = item.getXType();
                    if (xType == "label" || xType == "hidden") {
                        return;
                    }

                    var fieldLabelMaxWidth = item.label.getWidth() > item.ownerCt.labelWidth ? item.label.getWidth() : item.ownerCt.labelWidth;
                    var availableFieldWidth = adjWidth - (fieldLabelMaxWidth + this.totalPadding);

                    if (item.isXType("multifield")) {

                        // check if multifield width has been set 
                        // if Y, check if it's width is lt available fieldwidth, then set that width
                        // otherwise set with the available fieldWidth

                        // this will trigger resize event for nested multifield
                        if (item.width && item.width < availableFieldWidth) {
                            item.setWidth(item.width - 2);
                        } else {
                            item.setWidth(availableFieldWidth - 2);
                        }

                    } else {

                        var fieldHeight = item.editorHeight || item.getHeight();

                        // check if individual field width is lt the available fieldWidth
                        // if Y, then set the user supplied width, otherwise go for available width

                        // here is catch- 
                        // widget doesn't get resized if there is no difference between last and current dimension
                        // so, forcing it to resize by differentiating it's width by 2
                        if (item.width && item.width < availableFieldWidth) {
                            item.setWidth(item.width - 2);
                        } else {
                            item.setWidth(availableFieldWidth - 2);
                        }
                        item.setHeight(fieldHeight);
                    }

                } catch (e) {
                    CQ.Log.debug("CQ.form.CompositeMultiFieldWidget#onResize: " + e.message);
                }
            }
            CQ.form.CompositeMultiFieldWidget.superclass.onResize.call(this, arguments);
        }
    },
});

// register compositeMultiFieldWidget xtype
CQ.Ext.reg('compositeMultiFieldWidget', CQ.form.CompositeMultiFieldWidget);