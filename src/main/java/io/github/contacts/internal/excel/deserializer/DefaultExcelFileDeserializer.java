package io.github.contacts.internal.excel.deserializer;

import com.poiji.bind.Poiji;
import com.poiji.exception.PoijiExcelType;
import com.poiji.option.PoijiOptions;
import org.slf4j.Logger;

import java.io.InputStream;
import java.util.List;

import static io.github.contacts.internal.excel.deserializer.DeserializationUtils.getFileInputStream;

/**
 * This is the default configuration for excel deserialization for an excel view model of type T
 * @param <T> Type of excel view model
 */
public class DefaultExcelFileDeserializer<T> {
    private static final Logger log = org.slf4j.LoggerFactory.getLogger(DefaultExcelFileDeserializer.class);

    private final Class<T> deserializationClass;
    private final PoijiOptions poijiOptions;

    public DefaultExcelFileDeserializer(final Class<T> deserializationClass, final PoijiOptions poijiOptions) {
        this.deserializationClass = deserializationClass;
        this.poijiOptions = poijiOptions;
    }

    /**
     * This method opens a byte stream and converts the data file into a list of data items contained in its rows
     *
     * @param excelFile Received containing the data to be deserialized
     * @return List of data of type T
     */
    public List<T> deserialize(final byte[] excelFile) {
        InputStream fileInputStream = getFileInputStream(excelFile);
        long time = System.currentTimeMillis();
        List<T> entries = Poiji.fromExcel(fileInputStream, PoijiExcelType.XLSX, deserializationClass, poijiOptions);
        long readTime = System.currentTimeMillis() - time;
        log.info("\n{} entries deserialized from file: in {} millis", entries.size(), readTime);
        return entries;
    }
}
