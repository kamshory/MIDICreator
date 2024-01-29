function InputRange(selector, min, max)
{
    this.selector = null;
    this.minSelector = null;
    this.maxSelector = null;
    
    this.setMin = function(min)
    {
        this.minSelector.value = min;
    }
    this.setMax = function(max)
    {
        this.maxSelector.value = max;
    }
    this.getMin = function()
    {
        return this.minSelector.value;
    }
    this.getMax = function()
    {
        return this.maxSelector.value;
    }
    this.init = function(selector, min, max)
    {
        this.selector = selector;
        this.minSelector = this.selector.querySelector('.input-min');
        this.maxSelector = this.selector.querySelector('.input-max');
        this.minSelector.setAttribute('data-max', max);
        this.maxSelector.setAttribute('data-min', min);
        this.setMin(min);
        this.setMax(max);

        this.minSelector.addEventListener('change', function(e){
            obj.setMaxAttr(e.target.value);
            if(e.target.value >= obj.maxMinValue())
            {
                e.target.value = obj.maxMinValue() - 1;
            }
        }, true);
        this.maxSelector.addEventListener('change', function(e){
            obj.setMinAttr(e.target.value);
            if(e.target.value <= obj.minMaxValue())
            {
                e.target.value = obj.minMaxValue() + 1;
            }
        }, true);
    }
    
    this.maxMinValue = function()
    {
        return parseInt(this.minSelector.getAttribute('data-max'));
    }
    
    this.minMaxValue = function()
    {
        return parseInt(this.maxSelector.getAttribute('data-min'));
    }
    
    this.setMinAttr = function(max)
    {
        return this.minSelector.setAttribute('data-max', max);
    }
    this.setMaxAttr = function(min)
    {
        return this.maxSelector.setAttribute('data-min', min);
    }
    
    this.init(selector, min, max);
    let obj = this;
}